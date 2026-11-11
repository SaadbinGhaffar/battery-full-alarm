package expo.modules.chargedalarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Receives the alarm notification's STOP button and swipe-away. Runs natively,
 * so it works with the screen off and whether or not the JS runtime is alive.
 */
class StopAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == AlarmNotification.ACTION_STOP) {
      AlarmPlayer.stop(context)
    }
  }
}
