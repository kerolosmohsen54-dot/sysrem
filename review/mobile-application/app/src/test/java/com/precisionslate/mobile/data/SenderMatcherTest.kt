package com.precisionslate.mobile.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SenderMatcherTest {
    @Test
    fun countryCodeAndLocalNumberFormatsMatch() {
        val storedSender = "010 1234-5678"

        assertTrue(SenderMatcher.matches("+20 10 1234 5678", storedSender))
        assertTrue(SenderMatcher.matches("0020-10-1234-5678", storedSender))
        assertTrue(SenderMatcher.matches("010-1234-5678", storedSender))
        assertTrue(SenderMatcher.matches("01012345678", storedSender))
    }

    @Test
    fun senderNamesMatchWithoutCaseDifferences() {
        assertTrue(SenderMatcher.matches("Wallet-Service", "wallet-service"))
        assertTrue(SenderMatcher.matches("  BANK ALERT ", "bank alert"))
    }

    @Test
    fun unrelatedSendersDoNotMatch() {
        assertFalse(SenderMatcher.matches("01012345678", "01087654321"))
        assertFalse(SenderMatcher.matches("", "wallet"))
        assertFalse(SenderMatcher.matches("wallet", "bank"))
    }
}
