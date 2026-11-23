package com.precisionslate.mobile.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class DevicePreferences(context: Context) {
    private val preferences = context.getSharedPreferences("mobile-preferences", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = preferences.getString("server_url", "").orEmpty()
        set(value) {
            preferences.edit().putString("server_url", value.trim().trimEnd('/')).apply()
        }

    fun saveToken(token: String) {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
        val encrypted = cipher.doFinal(token.toByteArray(Charsets.UTF_8))
        preferences.edit()
            .putString(TOKEN_IV, Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .putString(TOKEN_VALUE, Base64.encodeToString(encrypted, Base64.NO_WRAP))
            .apply()
    }

    fun token(): String? {
        val ivText = preferences.getString(TOKEN_IV, null) ?: return null
        val valueText = preferences.getString(TOKEN_VALUE, null) ?: return null
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(
            Cipher.DECRYPT_MODE,
            getOrCreateKey(),
            GCMParameterSpec(GCM_TAG_BITS, Base64.decode(ivText, Base64.NO_WRAP)),
        )
        return cipher.doFinal(Base64.decode(valueText, Base64.NO_WRAP)).toString(Charsets.UTF_8)
    }

    fun clearToken() {
        preferences.edit().remove(TOKEN_IV).remove(TOKEN_VALUE).apply()
    }

    private fun getOrCreateKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    private companion object {
        const val ANDROID_KEY_STORE = "AndroidKeyStore"
        const val KEY_ALIAS = "mobile-device-token"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val TOKEN_IV = "device_token_iv"
        const val TOKEN_VALUE = "device_token_ciphertext"
        const val GCM_TAG_BITS = 128
    }
}
