import ExpoModulesCore
import Foundation
import Network

public class Http10TcpModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Http10Tcp")

    AsyncFunction("request") { (options: [String: Any]) -> [String: Any] in
      try Self.perform(
        options: options,
        methodOverride: nil,
        writeBodyToFile: nil,
        isDownload: false
      )
    }

    AsyncFunction("downloadToFile") { (options: [String: Any]) -> [String: Any] in
      let destinationPath = options["destinationPath"] as? String ?? ""
      guard !destinationPath.isEmpty else {
        throw Http10TcpException("Missing destinationPath")
      }
      let partPath = destinationPath + ".part"
      let fm = FileManager.default
      if fm.fileExists(atPath: destinationPath) {
        throw Http10TcpException("Destination already exists")
      }
      if fm.fileExists(atPath: partPath) {
        throw Http10TcpException("Partial file already exists")
      }
      fm.createFile(atPath: partPath, contents: nil)

      do {
        let result = try Self.perform(
          options: options,
          methodOverride: "GET",
          writeBodyToFile: partPath,
          isDownload: true
        )
        let written = result["bytesWritten"] as? Int ?? 0
        if let expected = options["expectedBytes"] as? Int, written != expected {
          try? fm.removeItem(atPath: partPath)
          throw Http10TcpException("Size invalid: expected \(expected), got \(written)")
        }
        try fm.moveItem(atPath: partPath, toPath: destinationPath)
        return ["bytesWritten": written]
      } catch {
        try? fm.removeItem(atPath: partPath)
        throw error
      }
    }
  }

  private static func perform(
    options: [String: Any],
    methodOverride: String?,
    writeBodyToFile: String?,
    isDownload: Bool
  ) throws -> [String: Any] {
    let host = options["host"] as? String ?? ""
    let port = options["port"] as? Int ?? 80
    let method = methodOverride ?? (options["method"] as? String ?? "GET")
    let path = options["path"] as? String ?? "/"
    let timeoutMs = options["timeoutMs"] as? Int ?? (isDownload ? 60_000 : 5_000)
    let maxBodyBytes = options["maxBodyBytes"] as? Int ?? 2_097_152
    let userAgent = options["userAgent"] as? String ?? "Laneory/0.1"
    let expectedBytes = options["expectedBytes"] as? Int

    guard isPrivateIPv4(host) else {
      throw Http10TcpException("Host is not an allowed private IPv4 address")
    }
    if isDownload {
      guard path.hasPrefix("/SD/"), !path.contains("..") else {
        throw Http10TcpException("Unsafe remote path")
      }
    } else {
      guard path.hasPrefix("/"), !path.contains(".."), !path.contains("\r"), !path.contains("\n") else {
        throw Http10TcpException("Unsafe request path")
      }
    }

    return try http10(
      host: host,
      port: UInt16(port),
      method: method,
      path: path,
      timeoutMs: timeoutMs,
      maxBodyBytes: isDownload ? Int.max / 8 : maxBodyBytes,
      userAgent: userAgent,
      writeBodyToFile: writeBodyToFile,
      expectedBytes: expectedBytes
    )
  }

  private static func isPrivateIPv4(_ host: String) -> Bool {
    let parts = host.split(separator: ".").compactMap { Int($0) }
    guard parts.count == 4, parts.allSatisfy({ (0...255).contains($0) }) else { return false }
    let a = parts[0], b = parts[1]
    if a == 10 { return true }
    if a == 192 && b == 168 { return true }
    if a == 172 && (16...31).contains(b) { return true }
    if a == 192 && b == 72 { return true }
    return false
  }

  private static func http10(
    host: String,
    port: UInt16,
    method: String,
    path: String,
    timeoutMs: Int,
    maxBodyBytes: Int,
    userAgent: String,
    writeBodyToFile: String?,
    expectedBytes: Int?
  ) throws -> [String: Any] {
    let semaphore = DispatchSemaphore(value: 0)
    var resultBox: [String: Any]?
    var errorMessage: String?

    guard let nwPort = NWEndpoint.Port(rawValue: port) else {
      throw Http10TcpException("Invalid port")
    }

    let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
    var buffer = Data()
    var headersParsed = false
    var statusCode = 0
    var headers: [String: String] = [:]
    var bodyBytes = 0
    var fileHandle: FileHandle?
    if let writeBodyToFile {
      fileHandle = FileHandle(forWritingAtPath: writeBodyToFile)
    }

    func succeed(_ value: [String: Any]) {
      if resultBox != nil || errorMessage != nil { return }
      resultBox = value
      connection.cancel()
      semaphore.signal()
    }

    func fail(_ message: String) {
      if resultBox != nil || errorMessage != nil { return }
      errorMessage = message
      connection.cancel()
      semaphore.signal()
    }

    func appendBody(_ chunk: Data) {
      if writeBodyToFile != nil {
        fileHandle?.write(chunk)
        bodyBytes += chunk.count
        if let expectedBytes, bodyBytes > expectedBytes {
          fail("Server sent more data than declared")
        }
      } else {
        buffer.append(chunk)
        bodyBytes = buffer.count
        if bodyBytes > maxBodyBytes {
          fail("Response exceeded \(maxBodyBytes) bytes")
        }
      }
    }

    func completeResponse() {
      if !headersParsed {
        fail("Connection closed before HTTP headers")
        return
      }
      try? fileHandle?.close()
      let bodyData = writeBodyToFile == nil ? buffer : Data()
      succeed([
        "statusCode": statusCode,
        "headers": headers,
        "bodyBase64": bodyData.base64EncodedString(),
        "bytesWritten": bodyBytes
      ])
    }

    func receiveLoop() {
      connection.receive(minimumIncompleteLength: 1, maximumLength: 64 * 1024) { data, _, isComplete, error in
        if let error {
          fail(error.localizedDescription)
          return
        }
        if let data, !data.isEmpty {
          if !headersParsed {
            buffer.append(data)
            if let delim = buffer.range(of: Data([13, 10, 13, 10])) {
              let headerData = buffer.subdata(in: 0..<delim.lowerBound)
              guard let headerText = String(data: headerData, encoding: .isoLatin1) else {
                fail("Invalid HTTP headers encoding")
                return
              }
              let lines = headerText.components(separatedBy: "\r\n")
              guard let statusLine = lines.first else {
                fail("Invalid HTTP status line")
                return
              }
              let parts = statusLine.split(separator: " ")
              guard parts.count >= 2, let code = Int(parts[1]) else {
                fail("Invalid HTTP status line")
                return
              }
              statusCode = code
              for line in lines.dropFirst() where !line.isEmpty {
                if let idx = line.firstIndex(of: ":") {
                  let name = line[..<idx].trimmingCharacters(in: .whitespaces).lowercased()
                  let value = line[line.index(after: idx)...].trimmingCharacters(in: .whitespaces)
                  headers[name] = value
                }
              }
              let bodyStart = buffer.subdata(in: delim.upperBound..<buffer.endIndex)
              headersParsed = true
              buffer = Data()
              appendBody(bodyStart)
            } else if buffer.count > 32 * 1024 {
              fail("HTTP header exceeds 32 KiB")
              return
            }
          } else {
            appendBody(data)
          }
        }
        if isComplete {
          completeResponse()
          return
        }
        if errorMessage == nil && resultBox == nil {
          receiveLoop()
        }
      }
    }

    connection.stateUpdateHandler = { state in
      switch state {
      case .ready:
        let request =
          "\(method) \(path) HTTP/1.0\r\nHost: \(host)\r\nUser-Agent: \(userAgent)\r\nConnection: close\r\n\r\n"
        connection.send(content: request.data(using: .utf8), completion: .contentProcessed { error in
          if let error { fail(error.localizedDescription) }
        })
        receiveLoop()
      case .failed(let error):
        fail(error.localizedDescription)
      default:
        break
      }
    }

    connection.start(queue: DispatchQueue.global(qos: .userInitiated))
    if semaphore.wait(timeout: .now() + .milliseconds(timeoutMs)) == .timedOut {
      connection.cancel()
      try? fileHandle?.close()
      throw Http10TcpException("Request timed out after \(timeoutMs) ms")
    }
    if let errorMessage {
      throw Http10TcpException(errorMessage)
    }
    guard let resultBox else {
      throw Http10TcpException("Empty native result")
    }
    return resultBox
  }
}

internal final class Http10TcpException: Exception {
  private let msg: String
  init(_ msg: String) {
    self.msg = msg
    super.init()
  }
  override var reason: String { msg }
}
