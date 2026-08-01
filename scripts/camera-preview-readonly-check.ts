import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import { MiVueClient } from "../src/protocol/mivueClient.js";
import type { RemoteFile } from "../src/protocol/types.js";
import { HttpTransport } from "../src/transport/httpTransport.js";

const CAMERA_HOST = "192.72.1.1";
const CAMERA_PORT = 80;
const TIMEOUT_MS = 8_000;
const RANGE_END = 65_535;
const PREVIEW_PROPERTY = "Vendor.DeviceInfo.SupportPlaybackPreview";
const VIDEO_CATEGORIES = ["normal", "event", "parking"] as const;

type CheckStatus = "passed" | "failed" | "skipped";

interface CheckResult {
  readonly name: string;
  readonly status: CheckStatus;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly error?: string;
}

interface ValidationReport {
  readonly schemaVersion: 1;
  readonly generatedBy: "Laneory camera preview read-only check";
  readonly cameraHost: string;
  readonly requestPolicy: {
    readonly mode: "read-only";
    readonly attemptsPerRequest: 1;
    readonly timeoutMs: number;
    readonly rangeBytes: string;
  };
  readonly startedAt: string;
  finishedAt?: string;
  outcome?: "passed" | "partial" | "failed";
  checks: CheckResult[];
}

const report: ValidationReport = {
  schemaVersion: 1,
  generatedBy: "Laneory camera preview read-only check",
  cameraHost: CAMERA_HOST,
  requestPolicy: {
    mode: "read-only",
    attemptsPerRequest: 1,
    timeoutMs: TIMEOUT_MS,
    rangeBytes: `0-${RANGE_END}`,
  },
  startedAt: new Date().toISOString(),
  checks: [],
};

const transport = new HttpTransport({
  host: CAMERA_HOST,
  port: CAMERA_PORT,
  timeoutMs: TIMEOUT_MS,
  maxBodyBytes: RANGE_END + 1,
  attempts: 1,
});
const client = new MiVueClient(
  { host: CAMERA_HOST, httpPort: CAMERA_PORT, rtspPort: 554 },
  transport,
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function safeFileDetails(file: RemoteFile): Readonly<Record<string, unknown>> {
  return {
    path: file.path,
    name: file.name,
    category: file.category,
    mediaFormat: file.mediaFormat,
    sizeBytes: file.sizeBytes,
    recordedAt: file.recordedAt,
    ...(file.resolution === undefined ? {} : { resolution: file.resolution }),
    ...(file.durationSeconds === undefined ? {} : { durationSeconds: file.durationSeconds }),
  };
}

function assertSafeRemotePath(remotePath: string): void {
  if (
    !remotePath.startsWith("/SD/") ||
    remotePath.includes("..") ||
    /[\r\n?#]/u.test(remotePath)
  ) {
    throw new Error("Camera returned an unsafe media path; file checks were blocked");
  }
}

async function checkHead(label: string, file: RemoteFile): Promise<boolean> {
  try {
    assertSafeRemotePath(file.path);
    const response = await client.headFile(file.path);
    const passed = response.statusCode >= 200 && response.statusCode < 300;
    report.checks.push({
      name: `${label}.head`,
      status: passed ? "passed" : "failed",
      details: {
        statusCode: response.statusCode,
        contentLength: response.headers["content-length"],
        contentType: response.headers["content-type"],
        acceptRanges: response.headers["accept-ranges"],
      },
      ...(passed ? {} : { error: `Unexpected HTTP status ${response.statusCode}` }),
    });
    return passed;
  } catch (error) {
    report.checks.push({ name: `${label}.head`, status: "failed", error: errorMessage(error) });
    return false;
  }
}

async function checkRange(label: string, file: RemoteFile): Promise<void> {
  try {
    assertSafeRemotePath(file.path);
    const response = await transport.request({
      method: "GET",
      path: file.path,
      headers: { Range: `bytes=0-${RANGE_END}` },
    });
    const rangeHonored = response.statusCode === 206;
    report.checks.push({
      name: `${label}.range`,
      status: rangeHonored ? "passed" : "failed",
      details: {
        statusCode: response.statusCode,
        receivedBytes: response.body.byteLength,
        contentLength: response.headers["content-length"],
        contentRange: response.headers["content-range"],
        contentType: response.headers["content-type"],
        first16BytesHex: Buffer.from(response.body.subarray(0, 16)).toString("hex"),
      },
      ...(rangeHonored ? {} : { error: "Camera did not return HTTP 206 Partial Content" }),
    });
  } catch (error) {
    report.checks.push({
      name: `${label}.range`,
      status: "failed",
      error: errorMessage(error),
    });
  }
}

async function findFirstFile(
  label: string,
  categories: readonly ("normal" | "event" | "parking" | "photo")[],
): Promise<RemoteFile | undefined> {
  for (const category of categories) {
    try {
      const response = await client.listFiles({ category, count: 1, from: 0 });
      const file = response.files[0];
      report.checks.push({
        name: `${label}.list.${category}`,
        status: "passed",
        details: {
          reportedAmount: response.amount,
          returnedFiles: response.files.length,
          ...(file === undefined ? {} : { selectedFile: safeFileDetails(file) }),
        },
      });
      if (file !== undefined) return file;
    } catch (error) {
      report.checks.push({
        name: `${label}.list.${category}`,
        status: "failed",
        error: errorMessage(error),
      });
    }
  }
  return undefined;
}

async function main(): Promise<void> {
  console.log("Laneory camera preview check (read-only, one attempt per request)");
  console.log(`Camera: http://${CAMERA_HOST}:${CAMERA_PORT}`);

  try {
    const capability = await client.getProperty(PREVIEW_PROPERTY);
    const previewValue = capability.properties[PREVIEW_PROPERTY];
    const supported = ["YES", "TRUE", "1", "SUPPORTED"].includes(
      previewValue?.trim().toUpperCase() ?? "",
    );
    report.checks.push({
      name: "capability.playbackPreview",
      status: supported ? "passed" : "failed",
      details: { property: PREVIEW_PROPERTY, value: previewValue ?? null },
      ...(supported ? {} : { error: "Camera did not report preview support" }),
    });
    console.log(`Capability: ${previewValue ?? "not reported"}`);
  } catch (error) {
    report.checks.push({
      name: "capability.playbackPreview",
      status: "failed",
      error: errorMessage(error),
    });
    console.error(`Capability gate failed: ${errorMessage(error)}`);
  }

  const photo = await findFirstFile("photo", ["photo"]);
  if (photo === undefined) {
    report.checks.push({ name: "photo.media", status: "skipped", error: "No photo was found" });
  } else if (await checkHead("photo", photo)) {
    await checkRange("photo", photo);
  }

  const video = await findFirstFile("video", VIDEO_CATEGORIES);
  if (video === undefined) {
    report.checks.push({ name: "video.media", status: "skipped", error: "No video was found" });
  } else if (await checkHead("video", video)) {
    await checkRange("video", video);
  }
}

async function saveReport(): Promise<string> {
  report.finishedAt = new Date().toISOString();
  const failed = report.checks.filter((check) => check.status === "failed").length;
  const passed = report.checks.filter((check) => check.status === "passed").length;
  report.outcome = failed === 0 && passed > 0 ? "passed" : passed > 0 ? "partial" : "failed";

  const downloadsDirectory = join(homedir(), "Downloads");
  await mkdir(downloadsDirectory, { recursive: true });
  const timestamp = report.startedAt.replaceAll(":", "-").replaceAll(".", "-");
  const reportPath = join(downloadsDirectory, `laneory-camera-preview-check-${timestamp}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return reportPath;
}

main()
  .catch((error: unknown) => {
    report.checks.push({ name: "unexpected", status: "failed", error: errorMessage(error) });
    console.error(`Unexpected failure: ${errorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const reportPath = await saveReport();
      console.log(`\nReport saved to:\n${reportPath}`);
      console.log(`Outcome: ${report.outcome}`);
    } catch (error) {
      console.error(`Could not save report: ${errorMessage(error)}`);
      process.exitCode = 1;
    }
  });
