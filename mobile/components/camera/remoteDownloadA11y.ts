import type { RemoteDownloadUiState } from "@/components/camera/remoteDownloadState";

/** VoiceOver labels for compact camera download actions. */
export function remoteDownloadActionA11y(
  fileName: string,
  state: RemoteDownloadUiState,
): string {
  switch (state.kind) {
    case "queued":
      return state.position > 0
        ? `${fileName}, queued at position ${state.position}`
        : `${fileName}, queued`;
    case "downloading":
      return `${fileName}, downloading ${state.percent} percent`;
    case "paused":
      return `${fileName}, paused`;
    case "downloaded":
      return `${fileName}, downloaded`;
    case "failed":
      return `Retry download for ${fileName}`;
    default:
      return `Download ${fileName}`;
  }
}

export function remoteDetailPrimaryLabel(state: RemoteDownloadUiState): string {
  switch (state.kind) {
    case "queued":
      return "Added to queue";
    case "downloading":
      return `Downloading ${state.percent}%`;
    case "paused":
      return "Resume";
    case "downloaded":
      return "Play";
    case "failed":
      return "Retry";
    default:
      return "Download";
  }
}

export function shouldShowViewInQueue(state: RemoteDownloadUiState): boolean {
  return (
    state.kind === "queued" ||
    state.kind === "downloading" ||
    state.kind === "paused" ||
    state.kind === "failed"
  );
}
