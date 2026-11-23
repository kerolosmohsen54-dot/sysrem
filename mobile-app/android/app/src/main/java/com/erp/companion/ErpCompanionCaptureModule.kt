package com.erp.companion

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Settings
import android.content.ComponentName
import android.provider.Telephony
import android.text.TextUtils
import com.erp.companion.capture.CaptureConfigStore
import com.erp.companion.capture.CaptureForegroundService
import android.os.PowerManager
import android.os.Handler
import android.os.Looper
import android.widget.Toast
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ErpCompanionCaptureModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "ErpCompanionCapture"

  @ReactMethod fun configureSources(sourcesJson: String, promise: Promise) {
    try { CaptureConfigStore.setSources(context, sourcesJson); promise.resolve(true) }
    catch (error: Exception) { promise.reject("CAPTURE_CONFIG", error) }
  }

  @ReactMethod fun listSmsMessages(senderFilter: String, pickerMode: String, promise: Promise) {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("SMS_PERMISSION", "READ_SMS permission is required to select a message.")
      return
    }
    try {
      val messages = Arguments.createArray()
      val filter = senderFilter.trim().lowercase()
      val isSenderPicker = pickerMode.equals("sender", ignoreCase = true)
      val projection = arrayOf(
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE,
        Telephony.Sms.DATE_SENT,
      )
      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        projection,
        null,
        null,
        "${Telephony.Sms.DATE} DESC",
      )?.use { cursor ->
        val addressIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
        val sentDateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE_SENT)
        var included = 0
        while (cursor.moveToNext() && included < 100) {
          val sender = cursor.getString(addressIndex)?.trim().orEmpty()
          if (sender.isEmpty() || (filter.isNotEmpty() && !sender.lowercase().contains(filter))) continue
          val body = cursor.getString(bodyIndex).orEmpty()
          if (!isSenderPicker) {
            val matchedSources = CaptureConfigStore.matchingSmsSources(context, sender)
            if (matchedSources.isEmpty()) continue
          }
          val row = Arguments.createMap()
          row.putString("sender", sender)
          row.putString("body", body)
          val sentAt = cursor.getLong(sentDateIndex)
          val receivedAt = if (sentAt > 0L) sentAt else cursor.getLong(dateIndex)
          row.putDouble("receivedAt", receivedAt.toDouble())
          messages.pushMap(row)
          included++
        }
      }
      promise.resolve(messages)
    } catch (error: Exception) {
      promise.reject("SMS_READ_ERROR", "Could not read SMS messages.", error)
    }
  }

  @ReactMethod fun openNotificationSettings() {
    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  @ReactMethod fun hasNotificationAccess(promise: Promise) {
    val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    val component = ComponentName(context, com.erp.companion.capture.ErpNotificationListener::class.java)
    promise.resolve(!TextUtils.isEmpty(enabled) && enabled.contains(component.flattenToString()))
  }

  @ReactMethod fun setCaptureEnabled(enabled: Boolean, promise: Promise) {
    try {
      CaptureConfigStore.setCaptureEnabled(context, enabled)
      if (enabled && CaptureConfigStore.isSessionActive(context)) CaptureForegroundService.start(context)
      else CaptureForegroundService.stop(context)
      promise.resolve(true)
    } catch (error: Exception) { promise.reject("CAPTURE_SERVICE", error) }
  }

  @ReactMethod fun setSessionActive(active: Boolean) {
    CaptureConfigStore.setSessionActive(context, active)
    if (active && CaptureConfigStore.isCaptureEnabled(context)) CaptureForegroundService.start(context)
    else CaptureForegroundService.stop(context)
  }

  @ReactMethod fun showDuplicateNotice() {
    Handler(Looper.getMainLooper()).post {
      Toast.makeText(context, "تم تسجيل هذه الرسالة من قبل.", Toast.LENGTH_LONG).show()
    }
  }

  @ReactMethod fun isCaptureEnabled(promise: Promise) { promise.resolve(CaptureConfigStore.isCaptureEnabled(context)) }
  @ReactMethod fun isBatteryOptimizationExempt(promise: Promise) {
    val manager = context.getSystemService(PowerManager::class.java)
    promise.resolve(manager?.isIgnoringBatteryOptimizations(context.packageName) ?: true)
  }
  @ReactMethod fun openBatteryOptimizationSettings() {
    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }
}
