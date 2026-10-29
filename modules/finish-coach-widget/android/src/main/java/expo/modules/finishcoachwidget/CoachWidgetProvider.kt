package expo.modules.finishcoachwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.util.AtomicFile
import android.widget.RemoteViews
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

class CoachWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = refresh(context)
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action in listOf(REFRESH, Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED)) refresh(context)
  }
  override fun onDisabled(context: Context) {
    (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmIntent(context))
  }
  companion object {
    private const val REFRESH = "com.finishcoach.app.WIDGET_REFRESH"
    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(context, 8291,
      Intent(context, CoachWidgetProvider::class.java).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, CoachWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val snapshot = runCatching {
        JSONObject(AtomicFile(File(context.filesDir, "finish-coach-widget.json")).openRead().bufferedReader().use { it.readText() })
      }.getOrNull()
      val now = System.currentTimeMillis()
      val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now)
      val offset = -TimeZone.getDefault().getOffset(now) / 60000
      val stale = snapshot == null || snapshot.optInt("version") != 1 || snapshot.optString("date") != date || snapshot.optLong("expiresAt") <= now || snapshot.optInt("timeZoneOffset") != offset
      val status = if (stale) "stale" else snapshot!!.optString("status")
      val face = if (stale) "observe" else snapshot!!.optString("face")
      val image = when(face) {
        "watch" -> R.drawable.doberman_watch
        "strict" -> R.drawable.doberman_strict
        "expect" -> R.drawable.doberman_expect
        "approve" -> R.drawable.doberman_approve
        else -> R.drawable.doberman_observe
      }
      val fallback = context.getString(R.string.finish_widget_stale)
      val line = if(stale) snapshot?.optString("staleLine", fallback) ?: fallback else snapshot!!.optString("line")
      val value = if(stale) "—" else snapshot!!.optString("value", "—")
      val accessibility = if(stale) snapshot?.optString("staleAccessibility", fallback) ?: fallback else snapshot!!.optString("accessibility")
      val views = RemoteViews(context.packageName, R.layout.finish_coach_widget)
      views.setTextViewText(R.id.coach_line, line)
      views.setTextViewText(R.id.coach_value, value)
      views.setTextViewText(R.id.coach_badge, if(stale) "•" else snapshot!!.optString("badge", "•"))
      views.setImageViewResource(R.id.coach_face, image)
      views.setProgressBar(R.id.coach_progress, 100, if(stale) 0 else snapshot!!.optInt("percent").coerceIn(0,100), false)
      fun color(key: String, fallback: String) = runCatching { Color.parseColor(snapshot?.optString(key, fallback) ?: fallback) }.getOrDefault(Color.parseColor(fallback))
      if (Build.VERSION.SDK_INT >= 31) {
        views.setColorStateList(R.id.coach_root, "setBackgroundTintList", ColorStateList.valueOf(color("bg", "#F7F8FC")))
        views.setColorStateList(R.id.coach_line, "setBackgroundTintList", ColorStateList.valueOf(color("surface", "#E9F2EB")))
        views.setColorStateList(R.id.coach_progress, "setProgressTintList", ColorStateList.valueOf(color("accent", "#246C4B")))
      } else {
        views.setInt(R.id.coach_root, "setBackgroundColor", color("bg", "#F7F8FC"))
        views.setInt(R.id.coach_line, "setBackgroundColor", color("surface", "#E9F2EB"))
      }
      views.setTextColor(R.id.coach_line, color("text", "#172039"))
      views.setTextColor(R.id.coach_value, color("accent", "#246C4B"))
      views.setTextColor(R.id.coach_badge, if(status == "watch") Color.parseColor("#BD2837") else color("accent", "#246C4B"))
      views.setContentDescription(R.id.coach_root, accessibility)
      val launch = Intent(Intent.ACTION_VIEW, Uri.parse("finishcoach:///")).setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      views.setOnClickPendingIntent(R.id.coach_root, PendingIntent.getActivity(context, 8292, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      ids.forEach { manager.updateAppWidget(it, views) }
      val midnight = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1); set(Calendar.HOUR_OF_DAY,0); set(Calendar.MINUTE,0); set(Calendar.SECOND,0); set(Calendar.MILLISECOND,0) }
      // Inexact, permission-free refresh. Periodic OS widget updates are a fallback.
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).setWindow(AlarmManager.RTC, midnight.timeInMillis, 60000L, alarmIntent(context))
    }
  }
}
