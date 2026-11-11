package expo.modules.chargedalarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * The notification shown while the alarm rings, clock-app style: a STOP ALARM
 * button and swipe-away both stop the alarm through [StopAlarmReceiver]; tapping
 * the body opens the app. The channel is silent because [AlarmPlayer] does the
 * ringing itself.
 */
internal object AlarmNotification {
  const val ACTION_STOP = "expo.modules.chargedalarm.ACTION_STOP"
  private const val CHANNEL_ID = "charge-alarm-ringing"
  private const val NOTIFICATION_ID = 0xC4A6
  private const val TAG = "ChargedAlarm"
  private const val ACCENT = 0xFFFF5A00.toInt()

  fun show(context: Context, title: String, body: String) {
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    ensureChannel(nm)

    val stopIntent = PendingIntent.getBroadcast(
      context,
      1,
      Intent(context, StopAlarmReceiver::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).setPriority(Notification.PRIORITY_MAX)
    }

    builder
      .setSmallIcon(smallIcon(context))
      .setColor(ACCENT)
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(Notification.CATEGORY_ALARM)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(true)
      .setAutoCancel(true)
      .setDeleteIntent(stopIntent)
      .addAction(
        Notification.Action.Builder(null, "STOP ALARM", stopIntent).build()
      )

    openAppIntent(context)?.let { builder.setContentIntent(it) }

    try {
      nm.notify(NOTIFICATION_ID, builder.build())
    } catch (e: SecurityException) {
      // Notifications permission denied: the alarm still rings and can be
      // stopped in the app or by unplugging.
      Log.w(TAG, "Can't post the alarm notification", e)
    }
  }

  fun cancel(context: Context) {
    context.getSystemService(NotificationManager::class.java)?.cancel(NOTIFICATION_ID)
  }

  private fun ensureChannel(nm: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Charge alarm", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Shown while the charge alarm rings, with a STOP button"
      setSound(null, null) // the alarm player makes the sound
      enableVibration(false) // ...and the vibration
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      setBypassDnd(true)
    }
    nm.createNotificationChannel(channel)
  }

  private fun smallIcon(context: Context): Int {
    @Suppress("DiscouragedApi")
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun openAppIntent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      2,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
