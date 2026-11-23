package com.precisionslate.mobile.data

import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.UUID
import java.util.concurrent.TimeUnit

class ApiFailure(val status: Int) : RuntimeException("API request failed (HTTP $status).")

class RetryableApiFailure(status: Int) : IOException("Temporary server failure (HTTP $status).")

class MobileApi(
    serverUrl: String,
    private val tokenProvider: () -> String?,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    private val apiBase = normalizeApiBase(serverUrl)

    suspend fun get(path: String): JSONObject = request("GET", path)

    suspend fun write(
        method: String,
        path: String,
        body: JSONObject? = null,
        idempotencyKey: String = UUID.randomUUID().toString(),
    ): JSONObject = request(method, path, body, idempotencyKey)

    private suspend fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        idempotencyKey: String? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        val builder = Request.Builder()
            .url("$apiBase${if (path.startsWith('/')) path else "/$path"}")
            .header("Accept", "application/json")
        authorizationHeader(tokenProvider())?.let { builder.header("Authorization", it) }

        if (method != "GET") {
            builder.header("Idempotency-Key", idempotencyKey ?: UUID.randomUUID().toString())
            builder.header("Content-Type", JSON_MEDIA_TYPE.toString())
        }
        val bodyValue = body?.toString()?.toRequestBody(JSON_MEDIA_TYPE)
        builder.method(method, if (method == "GET") null else bodyValue ?: EMPTY_BODY)

        client.newCall(builder.build()).execute().use { response ->
            if (!response.isSuccessful) {
                if (response.code == 408 || response.code == 429 || response.code >= 500) {
                    throw RetryableApiFailure(response.code)
                }
                throw ApiFailure(response.code)
            }
            val responseText = response.body?.string().orEmpty()
            if (responseText.isBlank()) JSONObject() else JSONObject(responseText)
        }
    }

    companion object {
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
        private val EMPTY_BODY = ByteArray(0).toRequestBody(JSON_MEDIA_TYPE)

        fun normalizeApiBase(serverUrl: String): String {
            val origin = serverUrl.trim().trimEnd('/')
            val parsed = Uri.parse(origin)
            require(
                parsed.scheme?.equals("https", ignoreCase = true) == true &&
                    !parsed.host.isNullOrBlank() &&
                    parsed.encodedAuthority?.contains('@') != true &&
                    parsed.query == null &&
                    parsed.fragment == null,
            ) {
                "Enter an HTTPS server URL without credentials, query, or fragment."
            }
            val path = parsed.encodedPath.orEmpty().trimEnd('/')
            require(path.isEmpty() || path.equals("/api/v1", ignoreCase = true)) {
                "The server URL must be an origin or end with /api/v1."
            }
            val authority = parsed.encodedAuthority
                ?: throw IllegalArgumentException("The server URL must include a host.")
            return "https://$authority${if (path.isEmpty()) "/api/v1" else path}"
        }
    }
}
