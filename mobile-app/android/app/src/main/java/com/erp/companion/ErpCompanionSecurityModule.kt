package com.erp.companion

import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class ErpCompanionSecurityModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "ErpCompanionSecurity"

  @ReactMethod fun createPinHash(pin: String, promise: Promise) {
    try {
      if (!pin.matches(Regex("^[0-9]{6}$"))) throw IllegalArgumentException("PIN must contain six digits")
      val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
      val result = Arguments.createMap().apply {
        putString("salt", Base64.encodeToString(salt, Base64.NO_WRAP))
        putString("hash", derive(pin, salt))
      }
      promise.resolve(result)
    } catch (error: Exception) { promise.reject("PIN_HASH", error) }
  }

  @ReactMethod fun verifyPin(pin: String, salt: String, expected: String, promise: Promise) {
    try { promise.resolve(derive(pin, Base64.decode(salt, Base64.NO_WRAP)) == expected) }
    catch (error: Exception) { promise.reject("PIN_VERIFY", error) }
  }

  private fun derive(pin: String, salt: ByteArray): String {
    val spec = PBEKeySpec(pin.toCharArray(), salt, 120_000, 256)
    return try { Base64.encodeToString(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded, Base64.NO_WRAP) }
    finally { spec.clearPassword() }
  }
}
