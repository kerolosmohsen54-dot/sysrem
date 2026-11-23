package com.erp.companion

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

class ErpCompanionConfigModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "ErpCompanionConfig"

  override fun getConstants(): Map<String, Any> = mapOf(
    "apiBaseUrl" to BuildConfig::class.java.getField("API_BASE_URL").get(null).toString()
  )
}
