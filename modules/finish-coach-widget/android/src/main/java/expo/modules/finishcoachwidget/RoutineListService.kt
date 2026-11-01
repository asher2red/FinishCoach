package expo.modules.finishcoachwidget

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONArray

// Android 24–30 fallback. API 31+ passes RemoteCollectionItems directly.
class RoutineListService : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = Factory(applicationContext)
  private class Factory(private val context: Context) : RemoteViewsFactory {
    private var items = JSONArray()
    private var locale = "en"
    override fun onCreate() = onDataSetChanged()
    override fun onDataSetChanged() {
      val snapshot = readRoutineSnapshot(context)
      items = if (isRoutineSnapshotCurrent(snapshot)) snapshot?.optJSONArray("items") ?: JSONArray() else JSONArray()
      locale = snapshot?.optString("locale", "en") ?: "en"
    }
    override fun onDestroy() { items = JSONArray() }
    override fun getCount() = items.length()
    override fun getViewAt(position: Int): RemoteViews? = items.optJSONObject(position)?.let { routineRow(context, it, locale) }
    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount() = 1
    override fun getItemId(position: Int) = position.toLong()
    override fun hasStableIds() = false
  }
}
