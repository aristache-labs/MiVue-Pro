import ExpoModulesCore
import Foundation

/**
 * Isolated URLSession.background harness for Stage 0 feasibility on MiVue 866.
 * Not production. Single active download. Persists task metadata for restore.
 */
public final class BackgroundDownloadSpikeSession: NSObject, URLSessionDownloadDelegate {
  public static let shared = BackgroundDownloadSpikeSession()
  public static let sessionIdentifier = "app.laneory.mobile.bg-download-spike"

  private let defaults = UserDefaults.standard
  private let queue = OperationQueue()
  private var session: URLSession!
  private var emit: (([String: Any]) -> Void)?
  private var backgroundCompletionHandler: (() -> Void)?

  private enum Keys {
    static let taskId = "laneory.bgSpike.taskId"
    static let url = "laneory.bgSpike.url"
    static let destination = "laneory.bgSpike.destination"
    static let expectedBytes = "laneory.bgSpike.expectedBytes"
    static let phase = "laneory.bgSpike.phase"
    static let bytesWritten = "laneory.bgSpike.bytesWritten"
    static let httpStatus = "laneory.bgSpike.httpStatus"
    static let contentLength = "laneory.bgSpike.contentLength"
    static let acceptRanges = "laneory.bgSpike.acceptRanges"
  }

  private override init() {
    super.init()
    queue.name = "laneory.bg-download-spike"
    queue.maxConcurrentOperationCount = 1
    recreateSession()
  }

  public func attachEmitter(_ emitter: @escaping ([String: Any]) -> Void) {
    emit = emitter
  }

  public func setBackgroundCompletionHandler(_ handler: (() -> Void)?) {
    backgroundCompletionHandler = handler
  }

  /** Recreate session with the stable identifier (required after wake / process relaunch). */
  public func recreateSession() {
    let config = URLSessionConfiguration.background(withIdentifier: Self.sessionIdentifier)
    config.sessionSendsLaunchEvents = true
    config.isDiscretionary = false
    config.waitsForConnectivity = true
    config.allowsCellularAccess = true
    config.timeoutIntervalForRequest = 60
    config.timeoutIntervalForResource = 60 * 60 * 6
    session = URLSession(configuration: config, delegate: self, delegateQueue: queue)
  }

  public func ensureSessionForBackgroundEvents(identifier: String) {
    guard identifier == Self.sessionIdentifier else { return }
    recreateSession()
  }

  public func startDownload(urlString: String, destinationPath: String, expectedBytes: Int?) throws -> [String: Any] {
    guard let url = URL(string: urlString), url.scheme?.lowercased() == "http" else {
      throw SpikeError("URL must be http with a valid absolute form")
    }
    guard let host = url.host, isPrivateIPv4(host) else {
      throw SpikeError("Host is not an allowed private IPv4 address")
    }
    let path = url.path
    guard path.hasPrefix("/SD/"), !path.contains("..") else {
      throw SpikeError("Unsafe remote path — expected /SD/…")
    }
    guard !destinationPath.isEmpty else {
      throw SpikeError("Missing destinationPath")
    }

    let destURL = URL(fileURLWithPath: destinationPath)
    let partURL = URL(fileURLWithPath: destinationPath + ".part")
    let fm = FileManager.default
    if fm.fileExists(atPath: destURL.path) {
      throw SpikeError("Destination already exists")
    }
    let parentDir = destURL.deletingLastPathComponent()
    if !parentDir.path.isEmpty {
      try? fm.createDirectory(at: parentDir, withIntermediateDirectories: true)
    }
    if fm.fileExists(atPath: partURL.path) {
      try fm.removeItem(at: partURL)
    }

    // Cancel any existing spike task before starting a new one.
    let semaphore = DispatchSemaphore(value: 0)
    var existing: [URLSessionTask] = []
    session.getAllTasks { tasks in
      existing = tasks
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 5)
    existing.forEach { $0.cancel() }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("Laneory/0.1-bg-spike", forHTTPHeaderField: "User-Agent")
    request.setValue("close", forHTTPHeaderField: "Connection")
    // No Range header — Stage 0 documents whatever the camera returns on a full GET.

    let task = session.downloadTask(with: request)
    defaults.set(task.taskIdentifier, forKey: Keys.taskId)
    defaults.set(urlString, forKey: Keys.url)
    defaults.set(destinationPath, forKey: Keys.destination)
    if let expectedBytes {
      defaults.set(expectedBytes, forKey: Keys.expectedBytes)
    } else {
      defaults.removeObject(forKey: Keys.expectedBytes)
    }
    defaults.set("starting", forKey: Keys.phase)
    defaults.set(0, forKey: Keys.bytesWritten)
    defaults.removeObject(forKey: Keys.httpStatus)
    defaults.removeObject(forKey: Keys.contentLength)
    defaults.removeObject(forKey: Keys.acceptRanges)
    task.resume()

    let snapshot = activeSnapshot()
    emitEvent(phase: "starting", extra: snapshot)
    return snapshot
  }

  public func cancelActive() {
    let semaphore = DispatchSemaphore(value: 0)
    session.getAllTasks { tasks in
      tasks.forEach { $0.cancel() }
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 5)
    clearPersistedTask(phase: "cancelled")
    emitEvent(phase: "cancelled", extra: ["message": "Cancelled by user"])
  }

  public func activeSnapshot() -> [String: Any] {
    var out: [String: Any] = [
      "sessionIdentifier": Self.sessionIdentifier,
      "phase": defaults.string(forKey: Keys.phase) ?? "idle",
    ]
    if defaults.object(forKey: Keys.taskId) != nil {
      out["nativeTaskId"] = defaults.integer(forKey: Keys.taskId)
    }
    if let url = defaults.string(forKey: Keys.url) {
      out["urlRedacted"] = redactUrl(url)
    }
    if let dest = defaults.string(forKey: Keys.destination) {
      out["destinationPath"] = dest
      let part = dest + ".part"
      if let attrs = try? FileManager.default.attributesOfItem(atPath: part),
         let size = attrs[.size] as? NSNumber {
        out["partBytes"] = size.intValue
      }
    }
    if defaults.object(forKey: Keys.expectedBytes) != nil {
      out["expectedBytes"] = defaults.integer(forKey: Keys.expectedBytes)
    }
    out["bytesWritten"] = defaults.integer(forKey: Keys.bytesWritten)
    if defaults.object(forKey: Keys.httpStatus) != nil {
      out["httpStatus"] = defaults.integer(forKey: Keys.httpStatus)
    }
    if defaults.object(forKey: Keys.contentLength) != nil {
      out["contentLength"] = defaults.integer(forKey: Keys.contentLength)
    }
    if let ar = defaults.string(forKey: Keys.acceptRanges) {
      out["acceptRanges"] = ar
    }
    return out
  }

  public func restoreAndDescribe() -> [String: Any] {
    recreateSession()
    let semaphore = DispatchSemaphore(value: 0)
    var taskCount = 0
    var taskState: String = "none"
    session.getAllTasks { tasks in
      taskCount = tasks.count
      if let first = tasks.first {
        switch first.state {
        case .running: taskState = "running"
        case .suspended: taskState = "suspended"
        case .canceling: taskState = "canceling"
        case .completed: taskState = "completed"
        @unknown default: taskState = "unknown"
        }
      }
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 5)
    var snap = activeSnapshot()
    snap["restoredTaskCount"] = taskCount
    snap["restoredTaskState"] = taskState
    if taskCount > 0, (snap["phase"] as? String) == "idle" {
      defaults.set("downloading", forKey: Keys.phase)
      snap["phase"] = "downloading"
    }
    emitEvent(phase: snap["phase"] as? String ?? "idle", extra: snap)
    return snap
  }

  // MARK: - URLSessionDownloadDelegate

  public func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    defaults.set(Int(totalBytesWritten), forKey: Keys.bytesWritten)
    defaults.set("downloading", forKey: Keys.phase)
    if let response = downloadTask.response as? HTTPURLResponse {
      captureHttpMetadata(response)
    }
    emitEvent(phase: "downloading", extra: [
      "bytesWritten": Int(totalBytesWritten),
      "totalBytesExpectedToWrite": Int(totalBytesExpectedToWrite),
      "nativeTaskId": downloadTask.taskIdentifier,
    ])
  }

  public func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didFinishDownloadingTo location: URL
  ) {
    let destinationPath = defaults.string(forKey: Keys.destination) ?? ""
    let expected = defaults.object(forKey: Keys.expectedBytes) != nil
      ? defaults.integer(forKey: Keys.expectedBytes)
      : nil

    if let response = downloadTask.response as? HTTPURLResponse {
      captureHttpMetadata(response)
      if !(200...299).contains(response.statusCode) {
        defaults.set("failed", forKey: Keys.phase)
        emitEvent(phase: "failed", extra: [
          "message": "HTTP \(response.statusCode)",
          "httpStatus": response.statusCode,
        ])
        try? FileManager.default.removeItem(at: location)
        return
      }
    }

    guard !destinationPath.isEmpty else {
      defaults.set("failed", forKey: Keys.phase)
      emitEvent(phase: "failed", extra: ["message": "Missing destination path on complete"])
      return
    }

    let destURL = URL(fileURLWithPath: destinationPath)
    let partURL = URL(fileURLWithPath: destinationPath + ".part")
    let fm = FileManager.default
    do {
      if fm.fileExists(atPath: partURL.path) {
        try fm.removeItem(at: partURL)
      }
      try fm.moveItem(at: location, to: partURL)
      let attrs = try fm.attributesOfItem(atPath: partURL.path)
      let written = (attrs[.size] as? NSNumber)?.intValue ?? 0
      defaults.set(written, forKey: Keys.bytesWritten)

      if let expected, written != expected {
        try? fm.removeItem(at: partURL)
        defaults.set("failed", forKey: Keys.phase)
        emitEvent(phase: "failed", extra: [
          "message": "Size invalid: expected \(expected), got \(written)",
          "bytesWritten": written,
          "expectedBytes": expected,
        ])
        return
      }

      if fm.fileExists(atPath: destURL.path) {
        try fm.removeItem(at: destURL)
      }
      try fm.moveItem(at: partURL, to: destURL)
      defaults.set("completed", forKey: Keys.phase)
      emitEvent(phase: "completed", extra: [
        "bytesWritten": written,
        "destinationPath": destinationPath,
        "httpStatus": defaults.integer(forKey: Keys.httpStatus),
        "contentLength": defaults.object(forKey: Keys.contentLength) != nil
          ? defaults.integer(forKey: Keys.contentLength) : NSNull(),
        "acceptRanges": defaults.string(forKey: Keys.acceptRanges) ?? NSNull(),
      ])
    } catch {
      defaults.set("failed", forKey: Keys.phase)
      emitEvent(phase: "failed", extra: [
        "message": redactMessage(error.localizedDescription),
      ])
    }
  }

  public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if let response = task.response as? HTTPURLResponse {
      captureHttpMetadata(response)
    }
    guard let error else { return }
    let ns = error as NSError
    if ns.domain == NSURLErrorDomain && ns.code == NSURLErrorCancelled {
      // User cancel already handled.
      return
    }
    // Waiting / transient network — do not treat as definitive failure when waitsForConnectivity.
    let waitingCodes: Set<Int> = [
      NSURLErrorNotConnectedToInternet,
      NSURLErrorNetworkConnectionLost,
      NSURLErrorTimedOut,
      NSURLErrorCannotConnectToHost,
      NSURLErrorDNSLookupFailed,
      NSURLErrorDataNotAllowed,
    ]
    if ns.domain == NSURLErrorDomain && waitingCodes.contains(ns.code) {
      defaults.set("waiting_for_connectivity", forKey: Keys.phase)
      emitEvent(phase: "waiting_for_connectivity", extra: [
        "message": "Waiting for camera connection",
        "urlErrorCode": ns.code,
        "nativeTaskId": task.taskIdentifier,
      ])
      return
    }
    defaults.set("failed", forKey: Keys.phase)
    emitEvent(phase: "failed", extra: [
      "message": redactMessage(ns.localizedDescription),
      "urlErrorCode": ns.code,
      "nativeTaskId": task.taskIdentifier,
    ])
  }

  public func urlSession(_ session: URLSession, taskIsWaitingForConnectivity task: URLSessionTask) {
    defaults.set("waiting_for_connectivity", forKey: Keys.phase)
    emitEvent(phase: "waiting_for_connectivity", extra: [
      "message": "Waiting for camera connection",
      "nativeTaskId": task.taskIdentifier,
    ])
  }

  public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
    let handler = backgroundCompletionHandler
    backgroundCompletionHandler = nil
    DispatchQueue.main.async {
      handler?()
    }
  }

  // MARK: - Helpers

  private func captureHttpMetadata(_ response: HTTPURLResponse) {
    defaults.set(response.statusCode, forKey: Keys.httpStatus)
    let length = response.expectedContentLength
    if length >= 0 {
      defaults.set(Int(length), forKey: Keys.contentLength)
    }
    if let ar = response.value(forHTTPHeaderField: "Accept-Ranges") {
      defaults.set(ar, forKey: Keys.acceptRanges)
    }
    // Log a few safe header names only (no cookies / auth).
    var safeHeaders: [String: String] = [:]
    for key in ["Content-Type", "Content-Length", "Accept-Ranges", "Server", "Connection"] {
      if let v = response.value(forHTTPHeaderField: key) {
        safeHeaders[key] = v
      }
    }
    emitEvent(phase: defaults.string(forKey: Keys.phase) ?? "downloading", extra: [
      "httpStatus": response.statusCode,
      "safeResponseHeaders": safeHeaders,
      "contentLength": length >= 0 ? Int(length) : NSNull(),
    ])
  }

  private func clearPersistedTask(phase: String) {
    defaults.set(phase, forKey: Keys.phase)
    defaults.removeObject(forKey: Keys.taskId)
  }

  private func emitEvent(phase: String, extra: [String: Any]) {
    var payload = activeSnapshot()
    for (k, v) in extra {
      payload[k] = v
    }
    payload["phase"] = phase
    payload["ts"] = ISO8601DateFormatter().string(from: Date())
    emit?(payload)
  }

  private func redactUrl(_ raw: String) -> String {
    guard let url = URL(string: raw), let host = url.host else {
      return "<invalid-url>"
    }
    return "http://\(host)\(url.path)"
  }

  private func redactMessage(_ message: String) -> String {
    var out = message
    // Strip absolute file paths that may contain usernames.
    if let regex = try? NSRegularExpression(pattern: "/var/mobile/Containers[^\\s]+") {
      out = regex.stringByReplacingMatches(
        in: out,
        range: NSRange(out.startIndex..., in: out),
        withTemplate: "<container-path>"
      )
    }
    return out
  }

  private func isPrivateIPv4(_ host: String) -> Bool {
    let parts = host.split(separator: ".").compactMap { Int($0) }
    guard parts.count == 4, parts.allSatisfy({ (0...255).contains($0) }) else { return false }
    let a = parts[0], b = parts[1]
    if a == 10 { return true }
    if a == 172 && (16...31).contains(b) { return true }
    if a == 192 && b == 168 { return true }
    if a == 192 && b == 72 { return true } // common MiVue AP subnet
    if a == 127 { return true }
    return false
  }
}

private struct SpikeError: LocalizedError {
  let message: String
  init(_ message: String) { self.message = message }
  var errorDescription: String? { message }
}
