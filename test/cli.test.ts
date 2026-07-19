import assert from "node:assert/strict";
import test from "node:test";
import { parseCli } from "../src/cli.js";

test("CLI parses list filters", () => {
  const result = parseCli(["list", "--host", "192.72.1.1", "--count", "5", "--category", "parking"]);
  assert.equal(result.command, "list");
  assert.equal(result.host, "192.72.1.1");
  assert.equal(result.count, 5);
  assert.equal(result.category, "parking");
});

test("CLI parses a download path and output directory", () => {
  const result = parseCli([
    "download",
    "/SD/Parking/F/PARK260716-033609F.MP4",
    "--host",
    "192.72.1.1",
    "--output",
    "downloads-test",
  ]);
  assert.equal(result.command, "download");
  assert.equal(result.remotePath, "/SD/Parking/F/PARK260716-033609F.MP4");
  assert.equal(result.outputDirectory, "downloads-test");
});

test("CLI parses complete-list summary options", () => {
  const result = parseCli(["list", "--all", "--summary", "--count", "16"]);
  assert.equal(result.all, true);
  assert.equal(result.summary, true);
  assert.equal(result.count, 16);
});

test("CLI rejects --all with a non-zero --from", () => {
  assert.throws(() => parseCli(["list", "--all", "--from", "5"]), /nu poate fi combinat/);
});

test("CLI parses local NMEA to GPX export", () => {
  const result = parseCli(["gpx", "clip.NMEA", "--output", "clip.gpx"]);
  assert.equal(result.command, "gpx");
  assert.equal(result.inputPath, "clip.NMEA");
  assert.equal(result.outputPath, "clip.gpx");
});

test("CLI parses local dashboard port", () => {
  const result = parseCli(["web", "--host", "192.72.1.1", "--port", "4174"]);
  assert.equal(result.command, "web");
  assert.equal(result.host, "192.72.1.1");
  assert.equal(result.port, 4174);
});

test("CLI parses probe set dry-run", () => {
  const result = parseCli([
    "probe",
    "set",
    "--property",
    "Camera.Menu.UIMode",
    "--value",
    "MENU",
    "--dry-run",
    "--host",
    "192.72.1.1",
  ]);
  assert.equal(result.command, "probe");
  assert.equal(result.probeAction, "set");
  assert.equal(result.probeProperty, "Camera.Menu.UIMode");
  assert.equal(result.probeValue, "MENU");
  assert.equal(result.dryRun, true);
  assert.equal(result.confirm, false);
});

test("CLI parses probe del with path and confirm", () => {
  const result = parseCli([
    "probe",
    "del",
    "--path",
    "/SD/Normal/F/FILE.MP4",
    "--confirm",
  ]);
  assert.equal(result.probeAction, "del");
  assert.equal(result.remotePath, "/SD/Normal/F/FILE.MP4");
  assert.equal(result.confirm, true);
});

test("CLI rejects probe del without path", () => {
  assert.throws(() => parseCli(["probe", "del", "--confirm"]), /necesită --path/);
});
