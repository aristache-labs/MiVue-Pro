import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import { TransportError } from "../../camera-transport/src/index";
import {
  DEMO_FILES,
  DEMO_STATUS_BODY,
  buildDemoFileListXml,
  demoFileBytes,
} from "./fixtures";

/**
 * Local synthetic transport. Never opens sockets to camera IPs.
 */
export class DemoTransport implements Transport {
  async request(request: TransportRequest): Promise<TransportResponse> {
    if (request.path.includes("192.72.1.1") || request.path.includes("://")) {
      throw new TransportError("DemoTransport rejects absolute URLs / camera IP embeds", "DEMO");
    }

    if (request.path.includes("action=get") && request.path.includes("property=status")) {
      return textResponse(200, DEMO_STATUS_BODY);
    }

    if (request.path.includes("action=dir")) {
      return textResponse(200, buildDemoFileListXml(DEMO_FILES));
    }

    const file = DEMO_FILES.find((entry) => entry.path === request.path);
    if (file) {
      if (request.method === "HEAD") {
        return {
          statusCode: 200,
          headers: { "content-length": String(file.sizeBytes), "content-type": "application/octet-stream" },
          body: new Uint8Array(),
        };
      }
      return {
        statusCode: 200,
        headers: { "content-length": String(file.sizeBytes), "content-type": "application/octet-stream" },
        body: demoFileBytes(file.sizeBytes),
      };
    }

    return { statusCode: 404, headers: {}, body: new Uint8Array() };
  }
}

function textResponse(statusCode: number, text: string): TransportResponse {
  return {
    statusCode,
    headers: { "content-type": "text/plain" },
    body: new TextEncoder().encode(text),
  };
}
