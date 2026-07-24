import ExpoModulesCore
import Foundation

/**
 * Delivers background URLSession completion events to the spike session.
 * Required so iOS can wake the app when a background download finishes or needs attention.
 */
public final class BackgroundDownloadSpikeAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  #if os(iOS) || os(tvOS)
  public func application(
    _ application: UIApplication,
    handleEventsForBackgroundURLSession identifier: String,
    completionHandler: @escaping () -> Void
  ) {
    guard identifier == BackgroundDownloadSpikeSession.sessionIdentifier else {
      completionHandler()
      return
    }
    BackgroundDownloadSpikeSession.shared.setBackgroundCompletionHandler(completionHandler)
    BackgroundDownloadSpikeSession.shared.ensureSessionForBackgroundEvents(identifier: identifier)
  }
  #endif
}
