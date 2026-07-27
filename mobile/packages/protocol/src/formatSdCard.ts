import type { Transport } from "../../camera-transport/src/index";
import { CameraProtocolError } from "./errors";
import {
  assertCgiMutationSuccess,
  buildCgiPath,
  parseMutationBody,
  truncateBody,
} from "./cameraSettings";

/** Wire SET property — apk-observed (`PROPERTY_FORMAT_SDCARD`). */
export const FORMAT_SD_WIRE_PROPERTY = "SD0";
/** Wire SET value — apk-observed (`COMMAND_FORMAT_SDCARD`). */
export const FORMAT_SD_WIRE_VALUE = "format";
/** Status GET used for pre/post checks (camera-confirmed on MiVue 866). */
export const FORMAT_SD_STATUS_PROPERTY = "Camera.Menu.SD0";
/** Typed confirmation token for destructive UI. */
export const FORMAT_SD_CONFIRM_TOKEN = "FORMAT";

export type FormatSdCardOutcome = "success" | "failed" | "unknown";

export interface FormatSdCardResult {
  readonly outcome: FormatSdCardOutcome;
  readonly path: string;
  readonly preStatus?: string;
  readonly postStatus?: string;
  readonly message: string;
}

export function buildFormatSdCardPath(): string {
  return buildCgiPath("set", {
    property: FORMAT_SD_WIRE_PROPERTY,
    value: FORMAT_SD_WIRE_VALUE,
  });
}

function statusFromProperties(properties: Readonly<Record<string, string>>): string | undefined {
  const raw =
    properties[FORMAT_SD_STATUS_PROPERTY] ??
    properties[FORMAT_SD_WIRE_PROPERTY] ??
    Object.values(properties)[0];
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isSdCardStatusReadyForFormat(status: string | undefined): boolean {
  if (status === undefined) return false;
  return status.trim().toUpperCase() === "READY";
}

export async function readSdCardStatus(
  transport: Transport,
  options?: { readonly signal?: AbortSignal },
): Promise<{ readonly ok: boolean; readonly status?: string; readonly code?: number }> {
  const path = buildCgiPath("get", { property: FORMAT_SD_STATUS_PROPERTY });
  try {
    const response = await transport.request({
      method: "GET",
      path,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
    const { parsed } = parseMutationBody(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300 || parsed === undefined) {
      return { ok: false };
    }
    if (parsed.code !== 0 || parsed.message.toUpperCase() !== "OK") {
      return { ok: false, code: parsed.code };
    }
    return {
      ok: true,
      status: statusFromProperties(parsed.properties),
      code: parsed.code,
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Destructive SD format. Never retries. One SET only.
 * Pre: Camera.Menu.SD0 must report READY. Post: re-read status; classify success/failed/unknown.
 */
export async function formatSdCard(
  transport: Transport,
  options?: { readonly signal?: AbortSignal },
): Promise<FormatSdCardResult> {
  const path = buildFormatSdCardPath();

  const pre = await readSdCardStatus(transport, options);
  if (!pre.ok) {
    throw new CameraProtocolError(
      pre.code === 703
        ? "This camera does not expose SD card status for format (CGI 703)."
        : "Could not read SD card status before format. Format was not sent.",
    );
  }
  if (!isSdCardStatusReadyForFormat(pre.status)) {
    throw new CameraProtocolError(
      `SD card is not READY (status: ${pre.status ?? "unknown"}). Format was not sent.`,
    );
  }

  let setBodyText = "";
  try {
    const response = await transport.request({
      method: "GET",
      path,
      retryPolicy: "mutation",
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
    const { bodyText, parsed } = parseMutationBody(response.body);
    setBodyText = bodyText;
    assertCgiMutationSuccess(response.statusCode, bodyText, parsed);
  } catch (error) {
    if (error instanceof CameraProtocolError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    return {
      outcome: "unknown",
      path,
      preStatus: pre.status,
      message:
        `Format result unknown after transport error (${truncateBody(detail, 120)}). ` +
        "The camera may have formatted the card; the command was not retried.",
    };
  }

  const post = await readSdCardStatus(transport, options);
  if (!post.ok) {
    return {
      outcome: "unknown",
      path,
      preStatus: pre.status,
      message:
        "Camera accepted the format command, but SD status could not be re-read. " +
        "Refresh Library and verify on the camera.",
    };
  }
  if (isSdCardStatusReadyForFormat(post.status)) {
    return {
      outcome: "success",
      path,
      preStatus: pre.status,
      postStatus: post.status,
      message: "SD card format completed. Camera reports READY.",
    };
  }
  return {
    outcome: "failed",
    path,
    preStatus: pre.status,
    postStatus: post.status,
    message: `Format response was OK (${truncateBody(setBodyText, 40)}), but SD status is ${
      post.status ?? "unknown"
    }.`,
  };
}
