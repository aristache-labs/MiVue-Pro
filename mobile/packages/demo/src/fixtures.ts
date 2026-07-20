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
    durationSeconds: 60,
    sizeBytes: 48_000_000,
    writable: false,
    recordedAt: "2026-07-20 10:00:00",
  },
  {
    path: "/SD/Normal/F/DEMO260720-100100F.MP4",
    name: "DEMO260720-100100F.MP4",
    category: "normal",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 60,
    durationSeconds: 60,
    sizeBytes: 47_200_000,
    writable: false,
    recordedAt: "2026-07-20 10:01:00",
  },
  {
    path: "/SD/Normal/F/DEMO260720-083000F.MP4",
    name: "DEMO260720-083000F.MP4",
    category: "normal",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 30,
    durationSeconds: 60,
    sizeBytes: 32_000_000,
    writable: false,
    recordedAt: "2026-07-20 08:30:00",
  },
  {
    path: "/SD/Normal/R/DEMO260720-083000R.MP4",
    name: "DEMO260720-083000R.MP4",
    category: "normal",
    camera: "rear",
    mediaFormat: "MP4",
    resolution: "1280x720",
    fps: 30,
    durationSeconds: 60,
    sizeBytes: 18_000_000,
    writable: false,
    recordedAt: "2026-07-20 08:30:00",
  },
  {
    path: "/SD/Parking/F/DEMO260720-090000F.MP4",
    name: "DEMO260720-090000F.MP4",
    category: "parking",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 30,
    durationSeconds: 20,
    sizeBytes: 8_500_000,
    writable: false,
    recordedAt: "2026-07-20 09:00:00",
  },
  {
    path: "/SD/Parking/F/DEMO260719-221500F.MP4",
    name: "DEMO260719-221500F.MP4",
    category: "parking",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 30,
    durationSeconds: 15,
    sizeBytes: 6_200_000,
    writable: false,
    recordedAt: "2026-07-19 22:15:00",
  },
  {
    path: "/SD/Parking/F/DEMO260718-193000F.MP4",
    name: "DEMO260718-193000F.MP4",
    category: "parking",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 30,
    durationSeconds: 12,
    sizeBytes: 5_100_000,
    writable: false,
    recordedAt: "2026-07-18 19:30:00",
  },
  {
    path: "/SD/Event/F/DEMO260719-180000F.MP4",
    name: "DEMO260719-180000F.MP4",
    category: "event",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 60,
    durationSeconds: 30,
    sizeBytes: 22_000_000,
    writable: false,
    recordedAt: "2026-07-19 18:00:00",
  },
  {
    path: "/SD/Event/F/DEMO260719-180000R.MP4",
    name: "DEMO260719-180000R.MP4",
    category: "event",
    camera: "rear",
    mediaFormat: "MP4",
    resolution: "1280x720",
    fps: 30,
    durationSeconds: 30,
    sizeBytes: 9_800_000,
    writable: false,
    recordedAt: "2026-07-19 18:00:00",
  },
  {
    path: "/SD/Event/F/DEMO260718-114500F.MP4",
    name: "DEMO260718-114500F.MP4",
    category: "event",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 60,
    durationSeconds: 25,
    sizeBytes: 19_500_000,
    writable: false,
    recordedAt: "2026-07-18 11:45:00",
  },
  {
    path: "/SD/Photo/F/DEMO260719-120000F.JPG",
    name: "DEMO260719-120000F.JPG",
    category: "photo",
    camera: "front",
    mediaFormat: "JPG",
    sizeBytes: 2_400_000,
    writable: false,
    recordedAt: "2026-07-19 12:00:00",
  },
  {
    path: "/SD/Photo/F/DEMO260720-071200F.JPG",
    name: "DEMO260720-071200F.JPG",
    category: "photo",
    camera: "front",
    mediaFormat: "JPG",
    sizeBytes: 2_100_000,
    writable: false,
    recordedAt: "2026-07-20 07:12:00",
  },
  {
    path: "/SD/Photo/F/DEMO260718-160800F.JPG",
    name: "DEMO260718-160800F.JPG",
    category: "photo",
    camera: "front",
    mediaFormat: "JPG",
    sizeBytes: 1_900_000,
    writable: false,
    recordedAt: "2026-07-18 16:08:00",
  },
  {
    path: "/SD/Normal/F/DEMO260718-150000F.MP4",
    name: "DEMO260718-150000F.MP4",
    category: "normal",
    camera: "front",
    mediaFormat: "MP4",
    resolution: "1920x1080",
    fps: 60,
    durationSeconds: 60,
    sizeBytes: 45_000_000,
    writable: false,
    recordedAt: "2026-07-18 15:00:00",
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
