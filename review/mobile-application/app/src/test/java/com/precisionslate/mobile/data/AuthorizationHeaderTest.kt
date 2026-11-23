package com.precisionslate.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AuthorizationHeaderTest {
    @Test
    fun tokenIsSentAsBearerAuthorization() {
        assertEquals("Bearer device-token", authorizationHeader("device-token"))
    }

    @Test
    fun absentOrBlankTokenOmitsAuthorizationHeader() {
        assertNull(authorizationHeader(null))
        assertNull(authorizationHeader(""))
        assertNull(authorizationHeader(" "))
    }
}
