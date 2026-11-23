package com.precisionslate.mobile.data

internal fun authorizationHeader(token: String?): String? =
    token?.takeIf(String::isNotBlank)?.let { "Bearer $it" }
