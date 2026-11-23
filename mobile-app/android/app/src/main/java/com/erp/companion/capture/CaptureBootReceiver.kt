package com.erp.companion.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CaptureBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED && CaptureConfigStore.isSessionActive(context) && CaptureConfigStore.isCaptureEnabled(context)) {
      CaptureForegroundService.start(context)
    }
  }
}
