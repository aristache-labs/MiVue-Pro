package expo.modules.wifissid

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Current Wi‑Fi SSID via WifiManager / ConnectivityManager.
 * Strips system quotes. Never returns password or BSSID to JS.
 */
class WifiSsidModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WifiSsid")

    AsyncFunction("getCurrentSsid") {
      val context = appContext.reactContext
        ?: return@AsyncFunction mapOf("ssid" to null, "status" to "unsupported")

      if (!hasWifiPermission(context)) {
        return@AsyncFunction mapOf("ssid" to null, "status" to "permission_denied")
      }

      val ssid = readSsid(context)
      if (ssid != null) {
        mapOf("ssid" to ssid, "status" to "available")
      } else {
        mapOf("ssid" to null, "status" to "unavailable")
      }
    }
  }

  private fun hasWifiPermission(context: Context): Boolean {
    val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED
    val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
      PackageManager.PERMISSION_GRANTED
    if (fine || coarse) return true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return ContextCompat.checkSelfPermission(context, Manifest.permission.NEARBY_WIFI_DEVICES) ==
        PackageManager.PERMISSION_GRANTED
    }
    return false
  }

  private fun readSsid(context: Context): String? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val cm = context.applicationContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
      val network = cm?.activeNetwork
      val caps = network?.let { cm.getNetworkCapabilities(it) }
      if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
        @Suppress("DEPRECATION")
        val wifiManager =
          context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
        @Suppress("DEPRECATION")
        val info = wifiManager?.connectionInfo
        normalize(info?.ssid)?.let { return it }
      }
    }

    @Suppress("DEPRECATION")
    val wifiManager =
      context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
    @Suppress("DEPRECATION")
    return normalize(wifiManager?.connectionInfo?.ssid)
  }

  private fun normalize(raw: String?): String? {
    var value = raw?.trim().orEmpty()
    if (value.isEmpty()) return null
    if (value.length >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
      value = value.substring(1, value.length - 1)
    }
    val lower = value.lowercase()
    if (lower == "<unknown ssid>" || lower == "0x" || lower == "null") return null
    return value.ifEmpty { null }
  }
}
