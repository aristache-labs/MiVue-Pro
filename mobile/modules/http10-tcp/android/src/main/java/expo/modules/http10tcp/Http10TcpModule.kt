package expo.modules.http10tcp

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.charset.Charset
import java.util.Locale
import kotlin.math.min

class Http10TcpModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Http10Tcp")

    AsyncFunction("request") { options: Map<String, Any?> ->
      perform(options, methodOverride = null, writeBodyToFile = null, isDownload = false)
    }

    AsyncFunction("downloadToFile") { options: Map<String, Any?> ->
      val destinationPath = options["destinationPath"] as? String
        ?: throw CodedException("Missing destinationPath")
      val partPath = "$destinationPath.part"
      val dest = File(destinationPath)
      val part = File(partPath)
      if (dest.exists()) throw CodedException("Destination already exists")
      if (part.exists()) throw CodedException("Partial file already exists")
      part.parentFile?.mkdirs()
      if (!part.createNewFile()) throw CodedException("Could not create partial file")

      try {
        val result = perform(options, methodOverride = "GET", writeBodyToFile = partPath, isDownload = true)
        val written = (result["bytesWritten"] as Number).toInt()
        val expected = options["expectedBytes"] as? Number
        if (expected != null && written != expected.toInt()) {
          part.delete()
          throw CodedException("Size invalid: expected ${expected.toInt()}, got $written")
        }
        if (!part.renameTo(dest)) {
          part.copyTo(dest, overwrite = false)
          part.delete()
        }
        mapOf("bytesWritten" to written)
      } catch (error: Exception) {
        part.delete()
        throw error
      }
    }
  }

  private fun perform(
    options: Map<String, Any?>,
    methodOverride: String?,
    writeBodyToFile: String?,
    isDownload: Boolean
  ): Map<String, Any?> {
    val host = options["host"] as? String ?: ""
    val port = (options["port"] as? Number)?.toInt() ?: 80
    val method = methodOverride ?: (options["method"] as? String ?: "GET")
    val path = options["path"] as? String ?: "/"
    val timeoutMs = (options["timeoutMs"] as? Number)?.toInt() ?: if (isDownload) 60_000 else 5_000
    val maxBodyBytes = (options["maxBodyBytes"] as? Number)?.toInt() ?: 2_097_152
    val userAgent = options["userAgent"] as? String ?: "Laneory/0.1"
    val expectedBytes = (options["expectedBytes"] as? Number)?.toInt()

    if (!isPrivateIPv4(host)) throw CodedException("Host is not an allowed private IPv4 address")
    if (isDownload) {
      if (!path.startsWith("/SD/") || path.contains("..")) throw CodedException("Unsafe remote path")
    } else {
      if (!path.startsWith("/") || path.contains("..") || path.contains("\r") || path.contains("\n")) {
        throw CodedException("Unsafe request path")
      }
    }

    return http10(
      host = host,
      port = port,
      method = method,
      path = path,
      timeoutMs = timeoutMs,
      maxBodyBytes = if (isDownload) Int.MAX_VALUE / 8 else maxBodyBytes,
      userAgent = userAgent,
      writeBodyToFile = writeBodyToFile,
      expectedBytes = expectedBytes
    )
  }

  private fun isPrivateIPv4(host: String): Boolean {
    val parts = host.split(".").mapNotNull { it.toIntOrNull() }
    if (parts.size != 4 || parts.any { it !in 0..255 }) return false
    val a = parts[0]
    val b = parts[1]
    if (a == 10) return true
    if (a == 192 && b == 168) return true
    if (a == 172 && b in 16..31) return true
    if (a == 192 && b == 72) return true
    return false
  }

  private fun http10(
    host: String,
    port: Int,
    method: String,
    path: String,
    timeoutMs: Int,
    maxBodyBytes: Int,
    userAgent: String,
    writeBodyToFile: String?,
    expectedBytes: Int?
  ): Map<String, Any?> {
    Socket().use { socket ->
      socket.soTimeout = timeoutMs
      socket.connect(InetSocketAddress(host, port), timeoutMs)
      val output = BufferedOutputStream(socket.getOutputStream())
      val request = "$method $path HTTP/1.0\r\nHost: $host\r\nUser-Agent: $userAgent\r\nConnection: close\r\n\r\n"
      output.write(request.toByteArray(Charsets.US_ASCII))
      output.flush()

      val input = BufferedInputStream(socket.getInputStream())
      val headerBuffer = ByteArrayOutputGrow(32 * 1024)
      var delimiter = -1
      while (delimiter < 0) {
        val b = input.read()
        if (b < 0) throw CodedException("Connection closed before HTTP headers")
        headerBuffer.write(b)
        if (headerBuffer.size() > 32 * 1024) throw CodedException("HTTP header exceeds 32 KiB")
        delimiter = headerBuffer.indexOfCrLfCrLf()
      }

      val headerBytes = headerBuffer.toByteArray()
      val headerText = String(headerBytes, 0, delimiter, Charset.forName("ISO-8859-1"))
      val lines = headerText.split("\r\n")
      val statusParts = lines.firstOrNull()?.split(" ") ?: throw CodedException("Invalid HTTP status line")
      if (statusParts.size < 2) throw CodedException("Invalid HTTP status line")
      val statusCode = statusParts[1].toIntOrNull() ?: throw CodedException("Invalid HTTP status line")
      val headers = mutableMapOf<String, String>()
      for (line in lines.drop(1)) {
        val idx = line.indexOf(':')
        if (idx > 0) {
          headers[line.substring(0, idx).trim().lowercase(Locale.US)] = line.substring(idx + 1).trim()
        }
      }

      var bodyStart = delimiter + 4
      val initialBody = if (bodyStart < headerBytes.size) {
        headerBytes.copyOfRange(bodyStart, headerBytes.size)
      } else {
        ByteArray(0)
      }

      var bodyBytes = 0
      val memoryBody = if (writeBodyToFile == null) ByteArrayOutputGrow(min(maxBodyBytes, 256 * 1024)) else null
      val fileOut = writeBodyToFile?.let { BufferedOutputStream(FileOutputStream(it)) }

      fun consume(chunk: ByteArray, length: Int = chunk.size) {
        if (length <= 0) return
        bodyBytes += length
        if (expectedBytes != null && bodyBytes > expectedBytes) {
          throw CodedException("Server sent more data than declared")
        }
        if (memoryBody != null) {
          if (bodyBytes > maxBodyBytes) throw CodedException("Response exceeded $maxBodyBytes bytes")
          memoryBody.write(chunk, 0, length)
        } else {
          fileOut!!.write(chunk, 0, length)
        }
      }

      consume(initialBody)
      val buf = ByteArray(64 * 1024)
      while (true) {
        val read = input.read(buf)
        if (read < 0) break
        consume(buf, read)
      }
      fileOut?.flush()
      fileOut?.close()

      val bodyBase64 = if (memoryBody != null) {
        android.util.Base64.encodeToString(memoryBody.toByteArray(), android.util.Base64.NO_WRAP)
      } else {
        ""
      }

      return mapOf(
        "statusCode" to statusCode,
        "headers" to headers,
        "bodyBase64" to bodyBase64,
        "bytesWritten" to bodyBytes
      )
    }
  }
}

private class ByteArrayOutputGrow(private val limit: Int) {
  private var buf = ByteArray(min(limit, 4096))
  private var count = 0

  fun write(b: Int) {
    ensure(1)
    buf[count++] = b.toByte()
  }

  fun write(b: ByteArray, off: Int, len: Int) {
    ensure(len)
    System.arraycopy(b, off, buf, count, len)
    count += len
  }

  fun size() = count
  fun toByteArray() = buf.copyOf(count)

  fun indexOfCrLfCrLf(): Int {
    var i = 0
    while (i + 3 < count) {
      if (buf[i] == 13.toByte() && buf[i + 1] == 10.toByte() && buf[i + 2] == 13.toByte() && buf[i + 3] == 10.toByte()) {
        return i
      }
      i++
    }
    return -1
  }

  private fun ensure(extra: Int) {
    if (count + extra > buf.size) {
      val next = min(limit, maxOf(buf.size * 2, count + extra))
      if (count + extra > next) throw CodedException("Buffer capacity exceeded")
      buf = buf.copyOf(next)
    }
  }
}
