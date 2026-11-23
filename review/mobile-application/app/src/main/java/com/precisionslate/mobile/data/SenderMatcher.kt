package com.precisionslate.mobile.data

import java.util.Locale

object SenderMatcher {
    fun matches(sender: String, filter: String): Boolean {
        val normalizedSender = normalize(sender)
        val normalizedFilter = normalize(filter)
        return normalizedSender.isNotEmpty() && normalizedSender == normalizedFilter
    }

    fun normalize(value: String): String {
        val trimmed = value.trim()
        if (trimmed.isEmpty()) return ""

        val digits = trimmed.filter(Char::isDigit)
        val isPhoneNumber = digits.isNotEmpty() && trimmed.all {
            it.isDigit() || it in "+- ()"
        }
        if (!isPhoneNumber) return trimmed.lowercase(Locale.ROOT)

        return when {
            digits.startsWith("0020") && digits.length > 4 -> "0${digits.drop(4)}"
            digits.startsWith("20") && digits.length == 12 -> "0${digits.drop(2)}"
            else -> digits
        }
    }
}
