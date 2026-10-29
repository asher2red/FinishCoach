package expo.modules.finishcoachwidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.util.AtomicFile
import java.io.File
import org.json.JSONObject

class FinishCoachWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("FinishCoachWidget")
    AsyncFunction("writeSnapshot") { json: String ->
      val context = appContext.reactContext ?: error("Application context unavailable")
      val payload = JSONObject(json)
      require(payload.getInt("version") == 1)
      require(payload.getString("url") == "finishcoach:///")
      val file = AtomicFile(File(context.filesDir, "finish-coach-widget.json"))
      val stream = file.startWrite()
      try {
        stream.write(json.toByteArray(Charsets.UTF_8))
        file.finishWrite(stream)
      } catch (error: Exception) {
        file.failWrite(stream)
        throw error
      }
      CoachWidgetProvider.refresh(context)
    }
  }
}
