package com.erp.companion.capture

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments

class CaptureTaskService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    return HeadlessJsTaskConfig("ERP_CAPTURE", Arguments.fromBundle(extras), 60_000, true)
  }

  companion object {
    fun enqueue(context: Context, payload: Bundle) {
      val intent = Intent(context, CaptureTaskService::class.java).putExtras(payload)
      context.startService(intent)
      acquireWakeLockNow(context)
    }
  }
}