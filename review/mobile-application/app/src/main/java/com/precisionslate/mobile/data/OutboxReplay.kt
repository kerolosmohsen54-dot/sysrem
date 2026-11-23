package com.precisionslate.mobile.data

import java.io.IOException

data class QueuedWrite(
    val sequence: Long,
    val idempotencyKey: String,
    val attempts: Int = 0,
)

interface OutboxStore {
    suspend fun pending(): List<QueuedWrite>
    suspend fun markComplete(sequence: Long)
    suspend fun recordFailure(sequence: Long)
}

fun interface WriteSender {
    suspend fun send(write: QueuedWrite)
}

data class ReplayResult(
    val completedSequences: List<Long>,
    val failedSequence: Long?,
)

class OutboxReplay {
    suspend fun drain(
        store: OutboxStore,
        sender: WriteSender,
    ): ReplayResult {
        val completed = mutableListOf<Long>()
        for (write in store.pending().sortedBy(QueuedWrite::sequence)) {
            try {
                sender.send(write)
                store.markComplete(write.sequence)
                completed += write.sequence
            } catch (_: IOException) {
                store.recordFailure(write.sequence)
                return ReplayResult(completed, write.sequence)
            }
        }
        return ReplayResult(completed, null)
    }
}
