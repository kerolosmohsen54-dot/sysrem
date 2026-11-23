package com.erp.companion.capture

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

class CaptureForegroundService : Service() {
  override fun onCreate() {
    super.onCreate()
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(NotificationChannel(CHANNEL, "التقاط الرسائل عبر MASTER", NotificationManager.IMPORTANCE_LOW))
    }
    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    val notification = builder.setSmallIcon(android.R.drawable.ic_menu_info_details)
      .setContentTitle("MASTER")
      .setContentText("خدمة التقاط الرسائل مفعّلة")
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    else startForeground(ID, notification)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY
  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    private const val CHANNEL = "erp_capture"
    private const val ID = 4102
    fun start(context: Context) { context.startForegroundService(Intent(context, CaptureForegroundService::class.java)) }
    fun stop(context: Context) { context.stopService(Intent(context, CaptureForegroundService::class.java)) }
  }
}
