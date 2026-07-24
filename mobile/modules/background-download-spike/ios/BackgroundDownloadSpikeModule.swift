import ExpoModulesCore
import Foundation

public class BackgroundDownloadSpikeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BackgroundDownloadSpike")

    Events("onSpikeEvent")

    OnCreate {
      BackgroundDownloadSpikeSession.shared.attachEmitter { [weak self] payload in
        self?.sendEvent("onSpikeEvent", payload)
      }
    }

    AsyncFunction("isNativeAvailable") { () -> Bool in
      true
    }

    AsyncFunction("startDownload") { (options: [String: Any]) -> [String: Any] in
      let url = options["url"] as? String ?? ""
      let destinationPath = options["destinationPath"] as? String ?? ""
      let expectedBytes = options["expectedBytes"] as? Int
      return try BackgroundDownloadSpikeSession.shared.startDownload(
        urlString: url,
        destinationPath: destinationPath,
        expectedBytes: expectedBytes
      )
    }

    AsyncFunction("cancel") { () -> [String: Any] in
      BackgroundDownloadSpikeSession.shared.cancelActive()
      return BackgroundDownloadSpikeSession.shared.activeSnapshot()
    }

    AsyncFunction("getActiveTask") { () -> [String: Any] in
      BackgroundDownloadSpikeSession.shared.activeSnapshot()
    }

    AsyncFunction("restoreSession") { () -> [String: Any] in
      BackgroundDownloadSpikeSession.shared.restoreAndDescribe()
    }

    Function("getSessionIdentifier") { () -> String in
      BackgroundDownloadSpikeSession.sessionIdentifier
    }
  }
}
