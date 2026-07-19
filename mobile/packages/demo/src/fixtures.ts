import type { RemoteFile } from "../../parsers/src/index";

/** Synthetic catalogue — no real GPS/media from a user camera. */
export const DEMO_FILES: readonly RemoteFile[] = [
  {
    path: "/SD/Normal/F/DEMO260720-100000F.MP4",
    name: "DEMO260720-100000F.MP4",
    category: "normal",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 60,
    durationSeconds: 12,
    sizeBytes: 1_024_000,
    writable: false,
    recordedAt: "2026-07-20 10:00:00",
  },
  {
    path: "/SD/Parking/F/DEMO260720-090000F.MP4",
    name: "DEMO260720-090000F.MP4",
    category: "parking",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 30,
    durationSeconds: 8,
    sizeBytes: 512_000,
    writable: false,
    recordedAt: "2026-07-20 09:00:00",
  },
  {
    path: "/SD/Event/F/DEMO260719-180000F.MP4",
    name: "DEMO260719-180000F.MP4",
    category: "event",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 60,
    durationSeconds: 20,
    sizeBytes: 2_048_000,
    writable: false,
    recordedAt: "2026-07-19 18:00:00",
  },
  {
    path: "/SD/Photo/F/DEMO260719-120000F.JPG",
    name: "DEMO260719-120000F.JPG",
    category: "photo",
    camera: "front",
    mediaFormat: "JPG",
    sizeBytes: 120_000,
    writable: false,
    recordedAt: "2026-07-19 12:00:00",
  },
];

export const DEMO_STATUS_BODY = "0\nOK\nstatus=\n";

export function demoFileBytes(size: number): Uint8Array {
  const body = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    body[i] = i % 251;
  }
  return body;
}

export function buildDemoFileListXml(files: readonly RemoteFile[]): string {
  const entries = files
    .map(
      (file) => `<file>
  <name>${file.path}</name>
  <format${file.resolution ? ` size="${file.resolution}"` : ""}${file.fps !== undefined ? ` fps="${file.fps}"` : ""}${file.durationSeconds !== undefined ? ` time="${file.durationSeconds}"` : ""}>${file.mediaFormat}</format>
  <size>${file.sizeBytes}</size>
  <attr>R</attr>
  <time>${file.recordedAt}</time>
</file>`,
    )
    .join("\n");
  return `<DCIM>\n${entries}\n<amount>${files.length}</amount>\n</DCIM>`;
}
