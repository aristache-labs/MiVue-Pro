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
  assert.equal(remoteDownloadActionA11y(name, { kind: "downloaded" }), "Downloaded. Open local recording");
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
  assert.match(sheet, /StaticBackdropSheet/);
  assert.equal(sheet.includes('animationType="slide"'), false);
  const shell = readFileSync(join(__dirname, "../media/StaticBackdropSheet.tsx"), "utf8");
  assert.match(shell, /animationType="none"/);
  assert.match(shell, /MEDIA_SCRIM_COLOR/);
  assert.equal(shell.includes("animatedIndex"), false);
  assert.match(shell, /translateY/);
  assert.match(shell, /isReduceMotionEnabled/);
});

test("library index wires RemoteDetailSheet and does not slide-detail Modal", () => {
  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  assert.match(index, /RemoteDetailSheet/);
  assert.equal(index.includes("animationType=\"slide\""), false);
  assert.match(index, /styles\.stickyOverlay/);
  assert.match(index, /onOpenDetail=\{selecting \? undefined : setDetailFile\}/);
  assert.match(index, /shouldEnqueueOnDownloadPress/);
});

test("compact action hit area contract", () => {
  const action = readFileSync(join(__dirname, "CompactDownloadAction.tsx"), "utf8");
  const hitStart = action.indexOf("hit:");
  const chipStart = action.indexOf("downloadChip:");
  assert.ok(hitStart >= 0 && chipStart > hitStart);
  const hitStyle = action.slice(hitStart, chipStart);
  assert.match(hitStyle, /minWidth:\s*MEDIA_ACTION_HIT/);
  assert.match(hitStyle, /minHeight:\s*MEDIA_ACTION_HIT/);
  assert.match(hitStyle, /flexShrink:\s*0/);
  assert.doesNotMatch(hitStyle, /width:\s*MEDIA_ACTION_HIT/);
  assert.doesNotMatch(hitStyle, /height:\s*MEDIA_ACTION_HIT/);
  assert.doesNotMatch(hitStyle, /position:\s*"absolute"/);
  assert.doesNotMatch(hitStyle, /marginRight:\s*-/);
  assert.doesNotMatch(hitStyle, /right:\s*-/);
  assert.doesNotMatch(hitStyle, /translateX/);

  const chipEnd = action.indexOf("downloadText:", chipStart);
  const chipStyle = action.slice(chipStart, chipEnd);
  assert.match(chipStyle, /minWidth:\s*88/);
  assert.match(chipStyle, /maxWidth:\s*100/);
  assert.match(action, /testID="compact-download-action"/);

  const media = readFileSync(join(__dirname, "../media/MediaCard.tsx"), "utf8");
  const cardStart = media.indexOf("card:");
  const rowStart = media.indexOf("row:", cardStart);
  const cardStyle = media.slice(cardStart, rowStart);
  assert.match(cardStyle, /width:\s*"100%"/);
  assert.match(cardStyle, /maxWidth:\s*"100%"/);
  assert.match(cardStyle, /overflow:\s*"hidden"/);
  assert.match(cardStyle, /minWidth:\s*0/);
  assert.match(media, /body:\s*\{\s*flex:\s*1,\s*minWidth:\s*0/);
  assert.match(media, /side:\s*\{[^}]*flexShrink:\s*0/s);
  assert.match(media, /numberOfLines=\{1\}/);

  const index = readFileSync(join(__dirname, "../../app/(tabs)/index.tsx"), "utf8");
  assert.match(index, /style=\{styles\.libraryFileRow\}/);
  const rowStyleStart = index.indexOf("libraryFileRow:");
  const stickyStart = index.indexOf("stickyOverlay:", rowStyleStart);
  assert.ok(rowStyleStart >= 0 && stickyStart > rowStyleStart);
  const libraryRowStyle = index.slice(rowStyleStart, stickyStart);
  assert.match(libraryRowStyle, /width:\s*"100%"/);
  assert.match(libraryRowStyle, /maxWidth:\s*"100%"/);
  assert.match(libraryRowStyle, /minWidth:\s*0/);
  assert.doesNotMatch(libraryRowStyle, /paddingHorizontal/);
});
