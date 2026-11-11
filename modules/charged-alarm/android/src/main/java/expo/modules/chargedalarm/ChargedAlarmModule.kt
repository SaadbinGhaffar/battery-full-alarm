package expo.modules.chargedalarm

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS bridge for [AlarmPlayer]: a real alarm that rings on the ALARM stream,
 * keeps going in the background, and shows a notification whose STOP button
 * works natively (no JS needed).
 */
class ChargedAlarmModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ChargedAlarm")

    // Fired when the alarm is stopped from the notification or times out.
    Events("onStop")

    OnCreate {
      AlarmPlayer.onStopped = { sendEvent("onStop", emptyMap<String, Any>()) }
    }

    OnDestroy {
      AlarmPlayer.onStopped = null
    }

    Function("start") { sound: Boolean, vibrate: Boolean, notify: Boolean, title: String, body: String ->
      AlarmPlayer.start(context, sound, vibrate, notify, title, body)
    }

    Function("stop") {
      AlarmPlayer.stop()
    }

    Function("isRinging") {
      AlarmPlayer.isRinging
    }
  }
}
