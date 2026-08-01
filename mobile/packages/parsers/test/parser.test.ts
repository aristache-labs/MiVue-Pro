import assert from "node:assert/strict";
import test from "node:test";
import {
  ProtocolParseError,
  parseConfigResponse,
  parseFileListXml,
  parseMenuPropertyValue,
} from "../src/parser";

test("parseConfigResponse preserves empty property values", () => {
  const result = parseConfigResponse("0\r\nOK\r\nstatus=\r\n");
  assert.equal(result.code, 0);
  assert.equal(result.message, "OK");
  assert.deepEqual(result.properties, { status: "" });
});

test("parseMenuPropertyValue reads a named value from the camera XML aggregate", () => {
  const property = "Vendor.DeviceInfo.SupportPlaybackPreview";
  assert.equal(
    parseMenuPropertyValue(
      `<?xml version="1.0"?><camera><property name="${property}" value="YES" /></camera>`,
      property,
    ),
    "YES",
  );
  assert.equal(
    parseMenuPropertyValue(
      `<?xml version="1.0"?><camera><item><name>${property}</name><value>YES</value></item></camera>`,
      property,
    ),
    "YES",
  );
  assert.equal(parseMenuPropertyValue("<camera />", property), undefined);
});

test("parseMenuPropertyValue rejects non-XML and unsafe property names", () => {
  assert.throws(() => parseMenuPropertyValue("0\nOK\n", "Camera.Menu.Property"), ProtocolParseError);
  assert.throws(() => parseMenuPropertyValue("<camera />", "bad\r\nname"), ProtocolParseError);
});

test("parseFileListXml parses confirmed metadata shape", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<DCIM>
<file>
  <name>/SD/Normal/F/FILE260714-185923F.MP4</name>
  <format size="1920x1080" fps="60" time="180.2">MP4</format>
  <size>389414912</size>
  <attr>RW</attr>
  <time>2026-07-14 18:59:23</time>
</file>
<amount>1</amount>
</DCIM>`;

  const result = parseFileListXml(xml);
  assert.equal(result.amount, 1);
  assert.equal(result.files[0]?.category, "normal");
  assert.equal(result.files[0]?.camera, "front");
  assert.equal(result.files[0]?.sizeBytes, 389414912);
});

test("parseFileListXml rejects malformed size metadata", () => {
  const xml = "<DCIM><file><name>/SD/Normal/F/a.MP4</name><size>-1</size><time>x</time></file></DCIM>";
  assert.throws(() => parseFileListXml(xml), ProtocolParseError);
});

test("parseFileListXml accepts category-specific roots", () => {
  const result = parseFileListXml("<Parking><amount>0</amount></Parking>");
  assert.equal(result.amount, 0);
  assert.deepEqual(result.files, []);
});
