package com.precisionslate.mobile.data

import androidx.room.withTransaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.UUID

data class AccountCard(
    val id: Long,
    val name: String,
    val type: String,
    val identifier: String?,
    val status: String,
    val balanceEgp: String?,
    val newMessageCount: Int,
)

data class AccountDraft(
    val name: String,
    val type: String,
    val number: String,
    val senderFilter: String,
    val depositKeywords: List<String>,
    val withdrawalKeywords: List<String>,
    val readDeposits: Boolean,
    val readWithdrawals: Boolean,
)

class ConnectionRequiredException : IOException("connection required to complete this")

class MobileRepository(
    private val database: LocalDatabase,
    private val preferences: DevicePreferences,
) {
    private val dao = database.localDao()
    private var mobileApi: MobileApi? = null
    private val replay = OutboxReplay()

    fun updateServerUrl(url: String) {
        MobileApi.normalizeApiBase(url)
        preferences.serverUrl = url
        mobileApi = createApi()
    }

    suspend fun login(username: String, password: String, deviceName: String) {
        val response = api().write(
            method = "POST",
            path = "/mobile/auth/login",
            body = JSONObject()
                .put("username", username)
                .put("password", password)
                .put("device_name", deviceName),
        )
        val token = response.getJSONObject("data").getString("access_token")
        preferences.saveToken(token)
        mobileApi = createApi()
        api().get("/mobile/auth/me")
    }

    suspend fun authenticateExistingSession() {
        mobileApi = createApi()
        api().get("/mobile/auth/me")
        refresh()
    }

    suspend fun confirmPassword(password: String) {
        api().write(
            method = "POST",
            path = "/mobile/auth/confirm-password",
            body = JSONObject().put("password", password),
        )
    }

    suspend fun signOut() {
        api().write(method = "POST", path = "/mobile/auth/logout")
        preferences.clearToken()
    }

    suspend fun accounts(): List<AccountCard> {
        val counts = dao.newMessageCounts().associate { it.channelId to it.count }
        return dao.channels().map { row ->
            AccountCard(
                id = row.id,
                name = row.name,
                type = row.channelType,
                identifier = row.identifier,
                status = row.status,
                balanceEgp = row.balanceEgp,
                newMessageCount = counts[row.id] ?: 0,
            )
        }
    }

    suspend fun cursor(): Long = dao.syncState()?.cursor ?: 0

    suspend fun pendingCount(): Int = dao.pendingOutbox().size

    suspend fun refresh() {
        drainOutbox()
        val ping = api().get("/mobile/ping").getJSONObject("data")
        val remoteCursor = ping.optLong("cursor", 0)
        var localCursor = cursor()
        if (localCursor == 0L || remoteCursor > localCursor) {
            var hasMore: Boolean
            do {
                val previousCursor = localCursor
                val response = api().get("/mobile/sync?cursor=$localCursor&limit=500")
                    .getJSONObject("data")
                val nextCursor = response.optLong("cursor", localCursor)
                persistSync(response, nextCursor)
                localCursor = nextCursor
                hasMore = response.optBoolean("has_more", false)
                if (hasMore && localCursor == previousCursor) {
                    throw IOException("Sync cursor did not advance.")
                }
            } while (hasMore)
        }
    }

    suspend fun addAccount(draft: AccountDraft, password: String): String {
        try {
            confirmPassword(password)

            val channelBody = JSONObject()
                .put("name", draft.name.trim())
                .put("channel_type", draft.type)
                .put("identifier", draft.number.trim().takeIf(String::isNotBlank) ?: JSONObject.NULL)
            val channelResponse = api().write(
                method = "POST",
                path = "/mobile/channels",
                body = channelBody,
                idempotencyKey = UUID.randomUUID().toString(),
            )
            val channelId = channelResponse.getJSONObject("data").getLong("id")

            if (draft.type != "post_office") {
                val sourceBody = JSONObject()
                    .put("channel_id", channelId)
                    .put("source_kind", "sms")
                    .put(
                        "sender_identifier",
                        draft.senderFilter.trim().takeIf(String::isNotBlank) ?: JSONObject.NULL,
                    )
                    .put("read_deposits", draft.readDeposits)
                    .put("read_withdrawals", draft.readWithdrawals)
                    .put("is_enabled", true)
                    .put("default_read_deposits", draft.readDeposits)
                    .put("default_read_withdrawals", draft.readWithdrawals)
                    .put("deposit_keywords", JSONArray(draft.depositKeywords))
                    .put("withdrawal_keywords", JSONArray(draft.withdrawalKeywords))
                api().write(
                    method = "POST",
                    path = "/mobile/sources",
                    body = sourceBody,
                    idempotencyKey = UUID.randomUUID().toString(),
                )
            }
        } catch (_: IOException) {
            throw ConnectionRequiredException()
        }

        refresh()
        return "Account added."
    }

    suspend fun setPaused(channelId: Long, paused: Boolean) {
        val row = dao.channel(channelId) ?: throw IOException("Account is not available locally.")
        dao.enqueue(
            OutboxRow(
                kind = HTTP_WRITE,
                method = "PATCH",
                path = "/mobile/channels/$channelId",
                bodyJson = JSONObject().put("status", if (paused) "paused" else "active").toString(),
            ),
        )
        val targetStatus = if (paused) "paused" else "active"
        dao.setChannelStatus(channelId, targetStatus)
        drainOutbox()
        if (row.status != targetStatus) refresh()
    }

    suspend fun retryQueue() {
        drainOutbox()
        refresh()
    }

    private suspend fun drainOutbox() {
        val store = RoomOutboxStore(dao)
        val result = replay.drain(store, WriteSender { write ->
            val row = dao.outboxRow(write.sequence) ?: return@WriteSender
            api().write(
                method = row.method,
                path = row.path,
                body = JSONObject(row.bodyJson),
                idempotencyKey = row.idempotencyKey,
            )
        })
        if (result.failedSequence != null) {
            throw IOException("A queued write is pending retry.")
        }
    }

    private suspend fun persistSync(data: JSONObject, cursor: Long) {
        val channels = data.optJSONArray("channels").asObjectList().mapNotNull { item ->
            val id = item.optLongOrNull("id") ?: return@mapNotNull null
            ChannelRow(
                id = id,
                name = item.optString("name"),
                channelType = item.optString("channel_type"),
                identifier = item.optNullableString("identifier"),
                status = item.optString("status", "active"),
                balanceEgp = item.optNullableString("balance_egp"),
            )
        }
        val messages = data.optJSONArray("messages").asObjectList().mapNotNull { item ->
            val id = item.optLongOrNull("id") ?: return@mapNotNull null
            MessageStatusRow(
                id = id,
                channelId = item.optLongOrNull("channel_id"),
                status = item.optString("status"),
            )
        }
        val syncedEntities = listOf("customers", "categories", "sources").flatMap { kind ->
            data.optJSONArray(kind).asObjectList().mapNotNull { item ->
                val id = item.optLongOrNull("id") ?: return@mapNotNull null
                SyncEntityRow(kind = kind, id = id, payloadJson = item.toString())
            }
        }
        withContext(Dispatchers.IO) {
            database.withTransaction {
                dao.applySync(channels, messages, syncedEntities, cursor)
            }
        }
    }

    private fun api(): MobileApi = mobileApi ?: createApi().also { mobileApi = it }

    private fun createApi(): MobileApi = MobileApi(preferences.serverUrl, preferences::token)

    private fun JSONArray?.asObjectList(): List<JSONObject> =
        (0 until (this?.length() ?: 0)).mapNotNull { index -> this?.optJSONObject(index) }

    private fun JSONObject.optLongOrNull(key: String): Long? =
        if (isNull(key) || !has(key)) null else optLong(key)

    private fun JSONObject.optNullableString(key: String): String? =
        if (isNull(key) || !has(key)) null else optString(key)

    private companion object {
        const val HTTP_WRITE = "HTTP_WRITE"
    }
}
