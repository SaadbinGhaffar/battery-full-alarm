package expo.modules.chargedalarm

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log

/**
 * Plays the looping "charged" alarm the way a clock app does:
 *
 *  - USAGE_ALARM audio, so it follows the alarm volume (not media volume),
 *    rings in silent/vibrate mode and passes Do Not Disturb's alarm exception.
 *  - A partial wake lock while playing (MediaPlayer.setWakeMode), so it keeps
 *    ringing with the screen off.
 *  - Alarm-usage vibration that repeats until stopped.
 *  - A safety timeout so a forgotten alarm can't ring forever.
 *
 * The process stays alive in the background thanks to the app's foreground
 * service; this object only needs to own the player.
 */
internal object AlarmPlayer {
  private const val TAG = "ChargedAlarm"
  private const val SOUND_RES_NAME = "alarm" // res/raw/alarm.wav (expo-notifications plugin)
  private const val AUTO_STOP_MS = 10 * 60 * 1000L
  private val VIBRATION_PATTERN = longArrayOf(0, 600, 400, 600, 900)

  private val alarmAttributes: AudioAttributes = AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_ALARM)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
    .build()

  private val mainHandler = Handler(Looper.getMainLooper())
  private val autoStop = Runnable { appContext?.let { stop(it) } ?: stop() }

  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null
  private var appContext: Context? = null

  /** Called when the alarm stops from outside JS (notification, timeout). */
  @Volatile
  var onStopped: (() -> Unit)? = null

  @Volatile
  var isRinging = false
    private set

  /**
   * Ring (sound and/or vibration) and, if [notify], show the alarm notification
   * with its STOP button. The notification is always shown while ringing, since
   * it's the way to stop the alarm from the lock screen.
   */
  @Synchronized
  fun start(context: Context, sound: Boolean, vibrate: Boolean, notify: Boolean, title: String, body: String) {
    release()
    val ctx = context.applicationContext
    appContext = ctx

    if (sound) startSound(ctx)
    if (vibrate) startVibration(ctx)

    isRinging = player != null || vibrator != null
    if (isRinging) mainHandler.postDelayed(autoStop, AUTO_STOP_MS)
    if (isRinging || notify) AlarmNotification.show(ctx, title, body)
  }

  /** Stop requested by JS: no need to echo an event back. */
  @Synchronized
  fun stop() {
    release()
    appContext?.let { AlarmNotification.cancel(it) }
  }

  /** Stop from the notification / timeout: also tell JS so its UI updates. */
  @Synchronized
  fun stop(context: Context) {
    release()
    AlarmNotification.cancel(context.applicationContext)
    onStopped?.invoke()
  }

  private fun release() {
    mainHandler.removeCallbacks(autoStop)

    player?.let {
      try {
        if (it.isPlaying) it.stop()
      } catch (e: IllegalStateException) {
        Log.w(TAG, "stop() on an unprepared player", e)
      }
      it.release()
    }
    player = null

    vibrator?.cancel()
    vibrator = null

    abandonFocus()
    isRinging = false
  }

  private fun startSound(context: Context) {
    val mp = MediaPlayer()
    try {
      mp.setAudioAttributes(alarmAttributes)
      setAlarmSource(context, mp)
      mp.isLooping = true
      mp.setWakeMode(context, PowerManager.PARTIAL_WAKE_LOCK)
      mp.prepare()
      requestFocus(context)
      mp.start()
      player = mp
    } catch (e: Exception) {
      Log.e(TAG, "Could not start alarm sound", e)
      mp.release()
    }
  }

  /** Bundled alarm tone, falling back to the user's system alarm sound. */
  private fun setAlarmSource(context: Context, mp: MediaPlayer) {
    @Suppress("DiscouragedApi")
    val resId = context.resources.getIdentifier(SOUND_RES_NAME, "raw", context.packageName)
    if (resId != 0) {
      context.resources.openRawResourceFd(resId).use { afd ->
        mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
      }
      return
    }
    val fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
    mp.setDataSource(context, fallback)
  }

  private fun startVibration(context: Context) {
    val vib = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
      @Suppress("DEPRECATION")
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
    if (vib == null || !vib.hasVibrator()) return

    try {
      when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> vib.vibrate(
          VibrationEffect.createWaveform(VIBRATION_PATTERN, 0),
          VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM)
        )
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.O -> {
          @Suppress("DEPRECATION")
          vib.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, 0), alarmAttributes)
        }
        else -> {
          @Suppress("DEPRECATION")
          vib.vibrate(VIBRATION_PATTERN, 0)
        }
      }
      vibrator = vib
    } catch (e: Exception) {
      Log.e(TAG, "Could not start vibration", e)
    }
  }

  /** Ask other audio (music, videos) to pause while the alarm rings. */
  private fun requestFocus(context: Context) {
    val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    audioManager = am
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(alarmAttributes)
        .build()
      focusRequest = request
      am.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
    }
  }

  private fun abandonFocus() {
    val am = audioManager ?: return
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      focusRequest?.let { am.abandonAudioFocusRequest(it) }
    } else {
      @Suppress("DEPRECATION")
      am.abandonAudioFocus(null)
    }
    focusRequest = null
    audioManager = null
  }
}
