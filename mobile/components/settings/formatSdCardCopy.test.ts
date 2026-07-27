import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  formatSdCardConfirmButton,
  formatSdCardDisabledReason,
  formatSdCardSecondConfirmMessage,
  formatSdCardWarningMessage,
} from "./formatSdCardCopy";

describe("formatSdCardCopy", () => {
  it("gates demo and disconnected", () => {
    assert.match(
      formatSdCardDisabledReason({ demoMode: true, cameraConnected: true, formatting: false }) ?? "",
      /Demo Mode/,
    );
    assert.match(
      formatSdCardDisabledReason({
        demoMode: false,
        cameraConnected: false,
        formatting: false,
      }) ?? "",
      /Connect/,
    );
    assert.equal(
      formatSdCardDisabledReason({ demoMode: false, cameraConnected: true, formatting: false }),
      undefined,
    );
  });

  it("warning includes camera identity and confirm token", () => {
    const msg = formatSdCardWarningMessage({
      cameraModel: "MiVue 866",
      firmware: "VI100.24.50.BE1WD.10",
      host: "192.72.1.1",
    });
    assert.match(msg, /MiVue 866/);
    assert.match(msg, /VI100\.24\.50\.BE1WD\.10/);
    assert.match(msg, /192\.72\.1\.1/);
    assert.match(msg, /permanently erases/i);
    assert.equal(formatSdCardConfirmButton(), "FORMAT");
    assert.match(formatSdCardSecondConfirmMessage(), /FORMAT/);
  });

  it("storage screen wires Format under Camera SD card only when connected", () => {
    const src = readFileSync(join(__dirname, "../../app/settings/storage.tsx"), "utf8");
    assert.match(src, /Format SD card/);
    assert.match(src, /formatCameraSdCard/);
    assert.match(src, /formatSdCardConfirmButton/);
    assert.match(src, /showCameraBreakdown\s*\?\s*\(/);
    assert.match(src, /showCameraBreakdown[\s\S]*Format SD card[\s\S]*cameraListLoading/);
    assert.doesNotMatch(src, /How to format the SD card/);
  });
});
