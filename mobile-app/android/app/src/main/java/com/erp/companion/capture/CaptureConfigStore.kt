package com.erp.companion.capture

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

object CaptureConfigStore {
  private const val PREFS = "capture_sources"
  private const val KEY_SOURCES = "sources_json"
  private const val KEY_ENABLED = "capture_enabled"
  private const val KEY_SESSION = "session_active"

  fun setCaptureEnabled(context: Context, enabled: Boolean) { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_ENABLED, enabled).apply() }
  fun isCaptureEnabled(context: Context): Boolean = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)
  fun setSessionActive(context: Context, active: Boolean) { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(KEY_SESSION, active).apply() }
  fun isSessionActive(context: Context): Boolean = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_SESSION, false)

  fun setSources(context: Context, raw: String) {
    val sources = JSONArray(raw)
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SOURCES, sources.toString()).apply()
  }

  private fun sources(context: Context): JSONArray = try {
    JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SOURCES, "[]"))
  } catch (_: Exception) { JSONArray() }

  fun matchingSmsSources(context: Context, sender: String): List<JSONObject> {
    val normalizedSender = sender.trim().lowercase()
    if (normalizedSender.isEmpty()) return emptyList()
    val matches = mutableListOf<JSONObject>()
    val list = sources(context)
    for (index in 0 until list.length()) {
      val source = list.optJSONObject(index) ?: continue
      if (!source.optBoolean("is_enabled") || source.optString("source_kind") != "sms") continue
      val filter = source.optString("sender_identifier").trim().lowercase()
      if (filter.isNotEmpty() && (normalizedSender == filter || normalizedSender.contains(filter))) matches.add(source)
    }
    return matches
  }
  fun matchingNotificationSource(context: Context, packageName: String): JSONObject? {
    val list = sources(context)
    for (index in 0 until list.length()) {
      val source = list.optJSONObject(index) ?: continue
      if (!source.optBoolean("is_enabled") || source.optString("source_kind") != "notification") continue
      if (!source.optBoolean("read_deposits") && !source.optBoolean("read_withdrawals")) continue
      val packages = source.optJSONArray("notification_package_names") ?: continue
      for (packageIndex in 0 until packages.length()) if (packages.optString(packageIndex) == packageName) return source
    }
    return null
  }

  fun isVerificationMessage(text: String): Boolean {
    val normalized = text.lowercase(Locale.ROOT).map { character ->
      when (character) {
        in '٠'..'٩' -> ('0'.code + (character.code - '٠'.code)).toChar()
        in '۰'..'۹' -> ('0'.code + (character.code - '۰'.code)).toChar()
        else -> character
      }
    }.joinToString("")
    val englishPattern = Regex("""\b(?:otp|one[\s-]?time\s+(?:password|passcode|code)|verification\s+(?:code|passcode|password)|security\s+(?:code|passcode)|login\s+(?:code|passcode)|reset\s+code|password\s+reset|forgot\s+password|passcode)\b""", RegexOption.IGNORE_CASE)
    if (englishPattern.containsMatchIn(normalized)) return true
    val shortCodePattern = Regex("""(?:\b(?:code|pin|passcode)\b|رمز|كود|رقم\s+(?:التحقق|التفعيل|الدخول))[^0-9]{0,24}\d{4,8}\b|\b\d{4,8}\b[^a-z0-9]{0,24}(?:\b(?:code|pin|passcode)\b|رمز|كود)""", RegexOption.IGNORE_CASE)
    if (shortCodePattern.containsMatchIn(normalized)) return true

    return listOf(
      "رمز التحقق", "كود التحقق", "رمز التأكيد", "كود التأكيد", "رمز التاكيد", "كود التاكيد",
      "رمز التفعيل", "كود التفعيل", "رمز الدخول", "كود الدخول", "رمز الأمان", "كود الأمان",
      "رمز لمرة واحدة", "كود لمرة واحدة", "كلمة المرور المؤقتة", "كلمة السر المؤقتة",
      "إعادة تعيين كلمة المرور", "اعادة تعيين كلمة المرور", "استعادة كلمة المرور",
      "نسيت كلمة المرور", "رمزك هو", "كودك هو",
    ).any { phrase -> normalized.contains(phrase) }
  }

  fun hasEnabledTransactionKeyword(source: JSONObject, text: String): Boolean {
    val normalized = text.lowercase(Locale.ROOT)
    return (source.optBoolean("read_deposits") && containsKeyword(source.optJSONArray("deposit_keywords"), normalized)) ||
      (source.optBoolean("read_withdrawals") && containsKeyword(source.optJSONArray("withdrawal_keywords"), normalized))
  }

  private fun containsKeyword(keywords: JSONArray?, normalizedText: String): Boolean {
    if (keywords == null) return false
    for (index in 0 until keywords.length()) {
      val keyword = keywords.optString(index).trim().lowercase(Locale.ROOT)
      if (keyword.isNotEmpty() && normalizedText.contains(keyword)) return true
    }
    return false
  }
}
