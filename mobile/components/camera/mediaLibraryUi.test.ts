import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  remoteDetailPrimaryLabel,
  remoteDownloadActionA11y,
  shouldShowViewInQueue,
} from "./remoteDownloadA11y";
import {
  MEDIA_ACTION_HIT,
  MEDIA_CARD_PADDING,
  MEDIA_SCRIM_COLOR,
  MEDIA_SHEET_MS,
  MEDIA_THUMB_H,
  MEDIA_THUMB_W,
} from "../media/mediaCardTokens";
import { LOCAL_ACTION_HIT } from "../local/localLibrarySections";

test("media card tokens match Local Library density", () => {
  assert.equal(MEDIA_THUMB_W, 84);
  assert.equal(MEDIA_THUMB_H, 63);
  assert.equal(MEDIA_CARD_PADDING, 12);
  assert.equal(MEDIA_ACTION_HIT, 44);
  assert.equal(MEDIA_ACTION_HIT, LOCAL_ACTION_HIT);
  assert.equal(MEDIA_SCRIM_COLOR, "rgba(0, 0, 0, 0.42)");
  assert.ok(MEDIA_SHEET_MS >= 180 && MEDIA_SHEET_MS <= 220);
});

test("Camera and Local cards share MediaCard", () => {
  const remote = readFileSync(join(__dirname, "RemoteRecordingCard.tsx"), "utf8");
  const local = readFileSync(join(__dirname, "../local/LocalLibraryCard.tsx"), "utf8");
  assert.match(remote, /from "@\/components\/media\/MediaCard"/);
  assert.match(local, /from "@\/components\/media\/MediaCard"/);
  assert.match(remote, /CompactDownloadAction/);
  assert.match(local, /share-outline/);
  assert.match(local, /trash-outline/);
});

test("compact download a11y labels", () => {
  const name = "PARK260719-140657F.MP4";
  assert.equal(remoteDownloadActionA11y(name, { kind: "available" }), `Download ${name}`);
  assert.equal(
    remoteDownloadActionA11y(name, { kind: "queued", position: 2, queueId: "q" }),
    `${name}, queued at position 2`,
  );
  assert.equal(
    remoteDownloadActionA11y(name, { kind: "downloading", percent: 42, queueId: "q" }),
    `${name}, downloading 42 percent`,
  );
  assert.equal(remoteDownloadActionA11y(name, { kind: "downloaded" }), `${name}, downloaded`);
  assert.equal(
    remoteDownloadActionA11y(name, { kind: "failed", queueId: "q" }),
    `Retry download for ${name}`,
  );
});

test("detail sheet primary labels and queue CTA", () => {
  assert.equal(remoteDetailPrimaryLabel({ kind: "available" }), "Download");
  assert.equal(remoteDetailPrimaryLabel({ kind: "queued", position: 1, queueId: "q" }), "Added to queue");
  assert.equal(
    remoteDetailPrimaryLabel({ kind: "downloading", percent: 42, queueId: "q" }),
    "Downloading 42%",
  );
  assert.equal(remoteDetailPrimaryLabel({ kind: "paused", queueId: "q" }), "Resume");
  assert.equal(remoteDetailPrimaryLabel({ kind: "failed", queueId: "q" }), "Retry");
  assert.equal(remoteDetailPrimaryLabel({ kind: "downloaded" }), "Play");
  assert.equal(shouldShowViewInQueue({ kind: "available" }), false);
  assert.equal(shouldShowViewInQueue({ kind: "queued", position: 1, queueId: "q" }), true);
  assert.equal(shouldShowViewInQueue({ kind: "downloaded" }), false);
});

test("detail sheet uses static scrim without Modal slide", () => {
  const sheet = readFileSync(join(__dirname, "RemoteDetailSheet.tsx"), "utf8");
  assert.match(sheet, /animationType="none"/);
  assert.match(sheet, /MEDIA_SCRIM_COLOR/);
  assert.equal(sheet.includes('animationType="slide"'), false);
  assert.equal(sheet.includes("animatedIndex"), false);
  assert.match(sheet, /translateY/);
  assert.match(sheet, /isReduceMotionEnabled/);
  assert.match(sheet, /testID="remote-detail-scrim"/);
});

test("library index wires RemoteDetailSheet and does not slide-detail Modal", () => {
  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  assert.match(index, /RemoteDetailSheet/);
  assert.equal(index.includes("animationType=\"slide\""), false);
  assert.match(index, /stickySectionHeadersEnabled=\{LOCAL_LIBRARY_STICKY_HEADERS\}/);
  assert.match(index, /onOpenDetail=\{setDetailFile\}/);
  assert.match(index, /shouldEnqueueOnDownloadPress/);
});

test("compact action hit area contract", () => {
  const action = readFileSync(join(__dirname, "CompactDownloadAction.tsx"), "utf8");
  assert.match(action, /mediaCardActionHitStyle/);
  assert.match(action, /testID="compact-download-action"/);
  const media = readFileSync(join(__dirname, "../media/MediaCard.tsx"), "utf8");
  assert.match(media, /MEDIA_ACTION_HIT/);
  assert.match(media, /numberOfLines=\{1\}/);
});
