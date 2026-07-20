import type { Transport, TransportRequest, TransportResponse } from "../../camera-transport/src/index";
import { TransportError } from "../../camera-transport/src/index";
import { DEMO_NMEA_BODY, DEMO_NMEA_PATH } from "./demoNmea";
import {
  DEMO_FILES,
  DEMO_STATUS_BODY,
  buildDemoFileListXml,
  demoFileBytes,
} from "./fixtures";

/** Minimal valid JPEG (1×1) for `/thumb/...` demo responses. */
const DEMO_THUMB_JPEG = Uint8Array.of(
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
  0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xff, 0xc4, 0x00, 0x14,
  0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0xff, 0xd9,
);

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

    // MiVue video thumbs: GET /thumb/Normal/F/FILE.MP4 (mirrors CLI CameraService).
    if (request.path.startsWith("/thumb/")) {
      const sdPath = `/SD${request.path.slice("/thumb".length)}`;
      const file = DEMO_FILES.find((entry) => entry.path === sdPath);
      if (!file) return { statusCode: 404, headers: {}, body: new Uint8Array() };
      if (request.method === "HEAD") {
        return {
          statusCode: 200,
          headers: {
            "content-length": String(DEMO_THUMB_JPEG.byteLength),
            "content-type": "image/jpeg",
          },
          body: new Uint8Array(),
        };
      }
      return {
        statusCode: 200,
        headers: {
          "content-length": String(DEMO_THUMB_JPEG.byteLength),
          "content-type": "image/jpeg",
        },
        body: DEMO_THUMB_JPEG,
      };
    }

    const file = DEMO_FILES.find((entry) => entry.path === request.path);
    if (file) {
      // Catalogue shows realistic sizes; download body is capped for Expo Go memory.
      const downloadBytes = Math.min(file.sizeBytes, 256_000);
      const isPhoto = /\.(?:JPG|JPEG)$/i.test(file.name);
      if (request.method === "HEAD") {
        return {
          statusCode: 200,
          headers: {
            "content-length": String(isPhoto ? DEMO_THUMB_JPEG.byteLength : downloadBytes),
            "content-type": isPhoto ? "image/jpeg" : "application/octet-stream",
          },
          body: new Uint8Array(),
        };
      }
      if (isPhoto) {
        return {
          statusCode: 200,
          headers: {
            "content-length": String(DEMO_THUMB_JPEG.byteLength),
            "content-type": "image/jpeg",
          },
          body: DEMO_THUMB_JPEG,
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
