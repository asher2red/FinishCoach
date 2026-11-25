package expo.modules.finishcoachwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.AtomicFile
import android.view.View
import android.widget.RemoteViews
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

// Used by both the provider and legacy collection service. Never show yesterday's list.
internal fun readRoutineSnapshot(context: Context): JSONObject? = runCatching {
  val saved = JSONObject(AtomicFile(File(context.filesDir, "finish-coach-widget.json"))
    .openRead().bufferedReader().use { it.readText() })
  if (isRoutineSnapshotCurrent(saved)) saved else {
    val upcoming = saved.optJSONArray("upcoming")
    (0 until (upcoming?.length() ?: 0))
      .asSequence()
      .mapNotNull { upcoming?.optJSONObject(it) }
      .firstOrNull { isRoutineSnapshotCurrent(it) } ?: saved
  }
}.getOrNull()
internal fun isRoutineSnapshotCurrent(snapshot: JSONObject?): Boolean {
  val now = System.currentTimeMillis()
  return snapshot != null && snapshot.optInt("version") == 2 && snapshot.optString("status") == "current" &&
    snapshot.optString("date") == SimpleDateFormat("yyyy-MM-dd", Locale.US).format(now) &&
    snapshot.optLong("expiresAt") > now && snapshot.optInt("timeZoneOffset") == -TimeZone.getDefault().getOffset(now) / 60000
}
internal fun routineRow(context: Context, item: JSONObject, locale: String): RemoteViews {
  val completed = item.optBoolean("completed")
  val title = item.optString("title").replace('\n', ' ').replace('\r', ' ')
  return RemoteViews(context.packageName, R.layout.finish_coach_widget_row).apply {
    setTextViewText(R.id.coach_task, title)
    setTextViewText(R.id.coach_check, if (completed) "\u2713" else "")
    val check = if (completed) R.drawable.finish_widget_check_done else R.drawable.finish_widget_check_open
    setInt(R.id.coach_check, "setBackgroundResource", check)
    val state = if (locale == "ko") { if (completed) "완료" else "미완료" } else { if (completed) "Completed" else "Not completed" }
    setContentDescription(R.id.coach_task, "$title, $state")
    setOnClickFillInIntent(R.id.coach_row, Intent())
  }
}
class CoachWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = refresh(context)
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: android.os.Bundle) = refresh(context)
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action in listOf(
        REFRESH, Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIME_CHANGED,
        Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_BOOT_COMPLETED,
        AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED
    )) refresh(context)
  }
  override fun onDisabled(context: Context) {
    (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarmIntent(context))
  }
  companion object {
    private const val REFRESH = "com.finishcoach.app.WIDGET_REFRESH"
    private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(context, 8291,
      Intent(context, CoachWidgetProvider::class.java).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    @Suppress("DEPRECATION")
    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, CoachWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val snapshot = readRoutineSnapshot(context)
      val current = isRoutineSnapshotCurrent(snapshot)
      val fallback = context.getString(R.string.finish_widget_stale)
      val titleBase = snapshot?.optString("titleBase", context.getString(R.string.finish_widget_title)) ?: context.getString(R.string.finish_widget_title)
      val done = snapshot?.optInt("done") ?: 0
      val total = snapshot?.optInt("total") ?: 0
      val percent = if (total > 0) ((done * 100.0 / total) + 0.5).toInt().coerceIn(0, 100) else 0
      val empty = if (current) snapshot!!.optString("empty") else snapshot?.optString("staleLine", fallback) ?: fallback
      val items = if (current) snapshot!!.optJSONArray("items") else null
      val launch = Intent(Intent.ACTION_VIEW, Uri.parse("finishcoach:///")).setPackage(context.packageName)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      val open = PendingIntent.getActivity(context, 8292, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val mutable = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
      val rowOpen = PendingIntent.getActivity(context, 8293, launch, PendingIntent.FLAG_UPDATE_CURRENT or mutable)
      ids.forEach { id ->
        val views = RemoteViews(context.packageName, R.layout.finish_coach_widget)
        views.setTextViewText(R.id.coach_title, titleBase)
        val progressVisibility = if (current) View.VISIBLE else View.GONE
        views.setViewVisibility(R.id.coach_percent, progressVisibility)
        views.setViewVisibility(R.id.coach_progress, progressVisibility)
        views.setTextViewText(R.id.coach_percent, "$percent%")
        views.setProgressBar(R.id.coach_progress, 100, percent, false)
        views.setContentDescription(R.id.coach_title, if (current) snapshot!!.optString("accessibility") else empty)
        views.setTextViewText(R.id.coach_empty, empty)
        views.setOnClickPendingIntent(R.id.coach_header, open)
        views.setOnClickPendingIntent(R.id.coach_empty, open)
        views.setEmptyView(R.id.coach_list, R.id.coach_empty)
        views.setPendingIntentTemplate(R.id.coach_list, rowOpen)
        if (Build.VERSION.SDK_INT >= 31) {
          val collection = RemoteViews.RemoteCollectionItems.Builder().setHasStableIds(false).setViewTypeCount(1)
          for (index in 0 until (items?.length() ?: 0)) {
            collection.addItem(index.toLong(), routineRow(context, items!!.getJSONObject(index), snapshot!!.optString("locale")))
          }
          views.setRemoteAdapter(R.id.coach_list, collection.build())
        } else {
          val service = Intent(context, RoutineListService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            data = Uri.parse("finishcoach-widget://list/$id")
          }
          views.setRemoteAdapter(R.id.coach_list, service)
        }
        manager.updateAppWidget(id, views)
      }
      if (Build.VERSION.SDK_INT < 31) manager.notifyAppWidgetViewDataChanged(ids, R.id.coach_list)
      val midnight = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1); set(Calendar.HOUR_OF_DAY,0); set(Calendar.MINUTE,0); set(Calendar.SECOND,0); set(Calendar.MILLISECOND,0) }
      val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val pending = alarmIntent(context)
      val time = midnight.timeInMillis
      if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
        try {
          alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pending)
          return
        } catch (_: SecurityException) {
          // The user can revoke exact-alarm access after the permission check.
        }
      }
      alarms.setAndAllowWhileIdle(AlarmManager.RTC, time, pending)
    }
  }
}
