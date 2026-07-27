/** Must match FORMAT_SD_CONFIRM_TOKEN in packages/protocol. */
const FORMAT_CONFIRM_TOKEN = "FORMAT";

export function formatSdCardDisabledReason(input: {
  readonly demoMode: boolean;
  readonly cameraConnected: boolean;
  readonly formatting: boolean;
}): string | undefined {
  if (input.formatting) return "Format already in progress.";
  if (input.demoMode) return "Format SD card is unavailable in Demo Mode.";
  if (!input.cameraConnected) return "Connect to the camera to format the SD card.";
  return undefined;
}

export function formatSdCardSubtitle(cameraConnected: boolean): string {
  return cameraConnected
    ? "Erases all recordings on the camera SD card"
    : "Connect to the camera first";
}

export function formatSdCardWarningMessage(input: {
  readonly cameraModel?: string;
  readonly firmware?: string;
  readonly host: string;
}): string {
  const model = input.cameraModel?.trim() || "Unknown model";
  const firmware = input.firmware?.trim() || "Unknown firmware";
  return (
    `This permanently erases all files on the camera SD card.\n\n` +
    `Camera: ${model}\n` +
    `Firmware: ${firmware}\n` +
    `Host: ${input.host}\n\n` +
    `Laneory will send a one-shot format command and will not retry automatically.`
  );
}

export function formatSdCardSecondConfirmMessage(): string {
  return (
    `Type confirmation is required.\n\n` +
    `Tap ${FORMAT_CONFIRM_TOKEN} to erase the SD card. This cannot be undone.`
  );
}

export function formatSdCardConfirmButton(): string {
  return FORMAT_CONFIRM_TOKEN;
}

export function formatSdCardResultTitle(outcome: "success" | "failed" | "unknown"): string {
  if (outcome === "success") return "SD card formatted";
  if (outcome === "unknown") return "Format result unknown";
  return "Format failed";
}
