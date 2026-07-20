import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import { TransportError } from "../../camera-transport/src/index";
import { DEMO_NMEA_BODY, DEMO_NMEA_PATH } from "./demoNmea";
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
      const propertyMatch = /(?:^|[?&])property=([^&]+)/.exec(request.path);
      const property = propertyMatch ? decodeURIComponent(propertyMatch[1] ?? "") : "DCIM";
      const files =
        property === "DCIM" || property === ""
          ? DEMO_FILES
          : DEMO_FILES.filter((file) => categoryProperty(file.category) === property);
      return textResponse(200, buildDemoFileListXml(files));
    }

    if (request.path === DEMO_NMEA_PATH) {
      const body = new TextEncoder().encode(DEMO_NMEA_BODY);
      if (request.method === "HEAD") {
        return {
          statusCode: 200,
          headers: { "content-length": String(body.byteLength), "content-type": "text/plain" },
          body: new Uint8Array(),
        };
      }
      return {
        statusCode: 200,
        headers: { "content-length": String(body.byteLength), "content-type": "text/plain" },
        body,
      };
    }

    const file = DEMO_FILES.find((entry) => entry.path === request.path);
    if (file) {
      // Catalogue shows realistic sizes; download body is capped for Expo Go memory.
      const downloadBytes = Math.min(file.sizeBytes, 256_000);
      if (request.method === "HEAD") {
        return {
          statusCode: 200,
          headers: { "content-length": String(downloadBytes), "content-type": "application/octet-stream" },
          body: new Uint8Array(),
        };
      }
      return {
        statusCode: 200,
        headers: { "content-length": String(downloadBytes), "content-type": "application/octet-stream" },
        body: demoFileBytes(downloadBytes),
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

function categoryProperty(category: (typeof DEMO_FILES)[number]["category"]): string {
  switch (category) {
    case "normal":
      return "Normal";
    case "event":
      return "Event";
    case "parking":
      return "Parking";
    case "photo":
      return "Photo";
    default:
      return "DCIM";
  }
}
