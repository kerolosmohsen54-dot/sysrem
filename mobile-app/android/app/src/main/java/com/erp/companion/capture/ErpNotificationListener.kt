package com.erp.companion.capture

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.os.Bundle
import android.app.Notification

class ErpNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!CaptureConfigStore.isSessionActive(this) || !CaptureConfigStore.isCaptureEnabled(this)) return
    val source = CaptureConfigStore.matchingNotificationSource(this, sbn.packageName) ?: return
    val extras: Bundle = sbn.notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
      ?: extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    if (text.isBlank()) return
    val body = if (title.isBlank()) text else "$title: $text"
    if (CaptureConfigStore.isVerificationMessage(body)) return
    if (!CaptureConfigStore.hasEnabledTransactionKeyword(source, body)) return
    val payload = Bundle().apply {
      putString("sourceKind", "notification")
      putInt("channelId", source.optInt("channel_id"))
      putString("sourcesJson", org.json.JSONArray().put(source).toString())
      putString("sender", sbn.packageName)
      putString("receivedAt", java.time.Instant.ofEpochMilli(sbn.postTime).toString())
      putString("rawText", body)
    }
    CaptureTaskService.enqueue(this, payload)
  }
}
