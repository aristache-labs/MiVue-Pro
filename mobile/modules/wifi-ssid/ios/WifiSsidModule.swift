import ExpoModulesCore
import Foundation
import NetworkExtension
import CoreLocation

/**
 * Current Wi‑Fi SSID via Apple NEHotspotNetwork.fetchCurrent.
 * Requires com.apple.developer.networking.wifi-info and (typically) When-In-Use location.
 * Never exposes password or BSSID to JS.
 *
 * Why location: Apple returns nil from fetchCurrent unless the app has precise location
 * authorization (or configured the hotspot / VPN). Laneory requests When-In-Use only
 * to display the camera SSID — coordinates are not read or stored.
 */
public class WifiSsidModule: Module {
  private let locationHelper = WifiSsidLocationHelper()

  public func definition() -> ModuleDefinition {
    Name("WifiSsid")

    AsyncFunction("getCurrentSsid") { () -> [String: Any?] in
      let auth = await self.locationHelper.ensureWhenInUseAuthorization()
      if auth == .denied || auth == .restricted {
        return ["ssid": nil, "status": "permission_denied"]
      }
      return await Self.fetchSsid()
    }
  }

  private static func fetchSsid() async -> [String: Any?] {
    await withCheckedContinuation { continuation in
      NEHotspotNetwork.fetchCurrent { network in
        guard let ssid = Self.normalize(network?.ssid) else {
          continuation.resume(returning: ["ssid": nil, "status": "unavailable"])
          return
        }
        continuation.resume(returning: ["ssid": ssid, "status": "available"])
      }
    }
  }

  private static func normalize(_ raw: String?) -> String? {
    guard var value = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
      return nil
    }
    if value.hasPrefix("\"") && value.hasSuffix("\"") && value.count >= 2 {
      value = String(value.dropFirst().dropLast())
    }
    let lower = value.lowercased()
    if lower == "<unknown ssid>" || lower == "0x" || value == "null" {
      return nil
    }
    return value
  }
}

private final class WifiSsidLocationHelper: NSObject, CLLocationManagerDelegate {
  private let manager = CLLocationManager()
  private var pending: CheckedContinuation<CLAuthorizationStatus, Never>?

  override init() {
    super.init()
    manager.delegate = self
  }

  func ensureWhenInUseAuthorization() async -> CLAuthorizationStatus {
    let current = manager.authorizationStatus
    if current != .notDetermined {
      return current
    }
    return await withCheckedContinuation { continuation in
      self.pending = continuation
      self.manager.requestWhenInUseAuthorization()
      DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
        guard let self, let pending = self.pending else { return }
        self.pending = nil
        pending.resume(returning: self.manager.authorizationStatus)
      }
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    let status = manager.authorizationStatus
    guard status != .notDetermined, let pending else { return }
    self.pending = nil
    pending.resume(returning: status)
  }
}
