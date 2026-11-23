package com.precisionslate.mobile.data

import kotlinx.coroutines.runBlocking
import java.io.IOException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OutboxReplayTest {
    @Test
    fun failedWriteRetriesWithTheSameIdempotencyKey() = runBlocking {
        val store = FakeOutboxStore(
            mutableListOf(QueuedWrite(sequence = 1, idempotencyKey = "stable-key")),
        )
        var attempts = 0
        val keys = mutableListOf<String>()

        val first = OutboxReplay().drain(store, WriteSender {
            attempts += 1
            keys += it.idempotencyKey
            throw IOException("temporary network failure")
        })
        val second = OutboxReplay().drain(store, WriteSender {
            attempts += 1
            keys += it.idempotencyKey
        })

        assertEquals(1L, first.failedSequence)
        assertEquals(listOf(1L), second.completedSequences)
        assertEquals(2, attempts)
        assertEquals(listOf("stable-key", "stable-key"), keys)
    }

    @Test
    fun completedWritesAreNotPostedAgainAfterLaterFailure() = runBlocking {
        val store = FakeOutboxStore(
            mutableListOf(
                QueuedWrite(sequence = 1, idempotencyKey = "first"),
                QueuedWrite(sequence = 2, idempotencyKey = "second"),
            ),
        )
        val seen = mutableListOf<Long>()

        val result = OutboxReplay().drain(store, WriteSender {
            seen += it.sequence
            if (it.sequence == 2L) throw IOException("temporary network failure")
        })
        val retry = OutboxReplay().drain(store, WriteSender { seen += it.sequence })

        assertEquals(listOf(1L), result.completedSequences)
        assertEquals(2L, result.failedSequence)
        assertEquals(listOf(2L), retry.completedSequences)
        assertEquals(listOf(1L, 2L, 2L), seen)
    }

    @Test
    fun replayAlwaysUsesSequenceOrder() = runBlocking {
        val store = FakeOutboxStore(
            mutableListOf(
                QueuedWrite(sequence = 3, idempotencyKey = "third"),
                QueuedWrite(sequence = 1, idempotencyKey = "first"),
                QueuedWrite(sequence = 2, idempotencyKey = "second"),
            ),
        )
        val seen = mutableListOf<Long>()

        val result = OutboxReplay().drain(store, WriteSender { seen += it.sequence })

        assertEquals(listOf(1L, 2L, 3L), seen)
        assertEquals(listOf(1L, 2L, 3L), result.completedSequences)
        assertNull(result.failedSequence)
    }

    private class FakeOutboxStore(
        private val writes: MutableList<QueuedWrite>,
    ) : OutboxStore {
        private val failures = mutableMapOf<Long, Int>()

        override suspend fun pending(): List<QueuedWrite> = writes.map {
            it.copy(attempts = failures[it.sequence] ?: it.attempts)
        }

        override suspend fun markComplete(sequence: Long) {
            writes.removeAll { it.sequence == sequence }
        }

        override suspend fun recordFailure(sequence: Long) {
            failures[sequence] = (failures[sequence] ?: 0) + 1
        }
    }
}
