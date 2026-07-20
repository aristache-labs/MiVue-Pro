import * as FileSystem from "expo-file-system/legacy";

import { APP_USER_AGENT } from "@/constants/Brand";
import {
  ExpoFsStreamingTransport,
  isNativeTcpAvailable,
  NativeTcpTransport,
  type Transport,
} from "@/packages/camera-transport/src/index";

/** Same live transport selection as DemoModeContext — GET/HEAD only. */
export function createOnboardingTransport(host: string, timeoutMs = 12_000): Transport {
  if (isNativeTcpAvailable()) {
    return new NativeTcpTransport({
      host,
      port: 80,
      timeoutMs: Math.min(timeoutMs, 5_000),
      userAgent: APP_USER_AGENT,
    });
  }
  return new ExpoFsStreamingTransport({
    host,
    port: 80,
    timeoutMs,
    userAgent: APP_USER_AGENT,
    fs: FileSystem,
  });
}
