package com.precisionslate.mobile.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Transaction
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import java.util.UUID

@Entity(tableName = "channels")
data class ChannelRow(
    @PrimaryKey val id: Long,
    val name: String,
    val channelType: String,
    val identifier: String?,
    val status: String,
    val balanceEgp: String?,
)

@Entity(tableName = "message_statuses")
data class MessageStatusRow(
    @PrimaryKey val id: Long,
    val channelId: Long?,
    val status: String,
)

@Entity(tableName = "sync_state")
data class SyncStateRow(
    @PrimaryKey val key: String = "cursor",
    val cursor: Long,
)

@Entity(
    tableName = "sync_entities",
    primaryKeys = ["kind", "id"],
)
data class SyncEntityRow(
    val kind: String,
    val id: Long,
    val payloadJson: String,
)

@Entity(tableName = "outbox")
data class OutboxRow(
    @PrimaryKey(autoGenerate = true) val sequence: Long = 0,
    val kind: String,
    val method: String,
    val path: String,
    val bodyJson: String,
    val idempotencyKey: String = UUID.randomUUID().toString(),
    val attempts: Int = 0,
)

data class ChannelMessageCount(
    val channelId: Long?,
    val count: Int,
)

@Dao
interface LocalDao {
    @Query("SELECT * FROM channels ORDER BY name COLLATE NOCASE, id")
    suspend fun channels(): List<ChannelRow>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun putChannels(rows: List<ChannelRow>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun putMessageStatuses(rows: List<MessageStatusRow>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun putSyncEntities(rows: List<SyncEntityRow>)

    @Query("SELECT channelId, COUNT(*) AS count FROM message_statuses WHERE status IN ('new', 'needs_review', 'ambiguous') GROUP BY channelId")
    suspend fun newMessageCounts(): List<ChannelMessageCount>

    @Query("SELECT * FROM sync_state WHERE `key` = 'cursor' LIMIT 1")
    suspend fun syncState(): SyncStateRow?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun putSyncState(row: SyncStateRow)

    @Insert
    suspend fun enqueue(row: OutboxRow): Long

    @Query("SELECT * FROM outbox ORDER BY sequence")
    suspend fun pendingOutbox(): List<OutboxRow>

    @Query("SELECT * FROM outbox WHERE sequence = :sequence LIMIT 1")
    suspend fun outboxRow(sequence: Long): OutboxRow?

    @Query("DELETE FROM outbox WHERE sequence = :sequence")
    suspend fun removeOutbox(sequence: Long)

    @Query("UPDATE outbox SET attempts = attempts + 1 WHERE sequence = :sequence")
    suspend fun incrementOutboxAttempts(sequence: Long)

    @Transaction
    suspend fun applySync(
        channels: List<ChannelRow>,
        messages: List<MessageStatusRow>,
        entities: List<SyncEntityRow>,
        cursor: Long,
    ) {
        putChannels(channels)
        putMessageStatuses(messages)
        putSyncEntities(entities)
        putSyncState(SyncStateRow(cursor = cursor))
    }

    @Query("SELECT * FROM channels WHERE id = :id LIMIT 1")
    suspend fun channel(id: Long): ChannelRow?

    @Query("UPDATE channels SET status = :status WHERE id = :id")
    suspend fun setChannelStatus(id: Long, status: String)
}

@Database(
    entities = [
        ChannelRow::class,
        MessageStatusRow::class,
        SyncStateRow::class,
        SyncEntityRow::class,
        OutboxRow::class,
    ],
    version = 2,
    exportSchema = false,
)
abstract class LocalDatabase : RoomDatabase() {
    abstract fun localDao(): LocalDao

    companion object {
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(database: SupportSQLiteDatabase) {
                database.execSQL(
                    """
                    CREATE TABLE `outbox_new` (
                        `sequence` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `kind` TEXT NOT NULL,
                        `method` TEXT NOT NULL,
                        `path` TEXT NOT NULL,
                        `bodyJson` TEXT NOT NULL,
                        `idempotencyKey` TEXT NOT NULL,
                        `attempts` INTEGER NOT NULL
                    )
                    """.trimIndent(),
                )
                database.execSQL(
                    """
                    INSERT INTO `outbox_new`
                        (`sequence`, `kind`, `method`, `path`, `bodyJson`, `idempotencyKey`, `attempts`)
                    SELECT `sequence`, `kind`, `method`, `path`, `bodyJson`, `idempotencyKey`, `attempts`
                    FROM `outbox`
                    WHERE `kind` != 'CREATE_ACCOUNT'
                    ORDER BY `sequence`
                    """.trimIndent(),
                )
                database.execSQL("DROP TABLE `outbox`")
                database.execSQL("ALTER TABLE `outbox_new` RENAME TO `outbox`")
            }
        }

        fun create(context: Context): LocalDatabase =
            Room.databaseBuilder(context, LocalDatabase::class.java, "mobile-local.db")
                .addMigrations(MIGRATION_1_2)
                .build()
    }
}

class RoomOutboxStore(private val dao: LocalDao) : OutboxStore {
    override suspend fun pending(): List<QueuedWrite> = dao.pendingOutbox().map {
        QueuedWrite(it.sequence, it.idempotencyKey, it.attempts)
    }

    override suspend fun markComplete(sequence: Long) {
        dao.removeOutbox(sequence)
    }

    override suspend fun recordFailure(sequence: Long) {
        dao.incrementOutboxAttempts(sequence)
    }
}
