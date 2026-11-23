package com.erp.companion.capture

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Telephony
import android.util.Log

class SmsCaptureReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Log.i("ErpSmsCapture", "receive action=${intent.action}")
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val active = CaptureConfigStore.isSessionActive(context)
    Log.i("ErpSmsCapture", "session=$active")
    // SMS permission and an authenticated session are sufficient for SMS capture.
    // Notification access and its optional foreground service must not block SMS.
    if (!active) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    Log.i("ErpSmsCapture", "segments=${messages.size}")
    if (messages.isEmpty()) return
    val sender = messages.firstOrNull()?.originatingAddress?.trim().orEmpty()
    val sources = CaptureConfigStore.matchingSmsSources(context, sender)
    Log.i("ErpSmsCapture", "matchedSources=${sources.size} senderLength=${sender.length}")
    if (sources.isEmpty()) return
    val body = messages.joinToString("") { it.messageBody.orEmpty() }
    if (body.isBlank()) return
    Log.i("ErpSmsCapture", "accepted_sender_message senderLength=${sender.length} bodyLength=${body.length}")
    val payload = Bundle().apply {
      putString("sourceKind", "sms")
      putInt("channelId", sources.first().optInt("channel_id"))
      putString("matchingChannelIds", sources.joinToString(",") { it.optInt("channel_id").toString() })
      val sourceArray = org.json.JSONArray()
      sources.forEach { sourceArray.put(it) }
      putString("sourcesJson", sourceArray.toString())
      putString("sender", sender)
      putString("receivedAt", java.time.Instant.ofEpochMilli(messages.first().timestampMillis).toString())
      putString("rawText", body)
    }
    Log.i("ErpSmsCapture", "enqueue channel=${sources.first().optInt("channel_id")}")
    CaptureTaskService.enqueue(context, payload)
  }
}
