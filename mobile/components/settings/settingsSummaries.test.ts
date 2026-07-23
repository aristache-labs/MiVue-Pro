import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aboutVersionSummary,
  cameraConnectionSummary,
  connectionHubKind,
  connectionStatusLabel,
  diagnosticsRequestStatus,
  diagnosticsSummary,
  legalSummary,
  mapsPreferenceSummary,
  storageSummary,
  transportLabel,
} from "./settingsSummaries";

describe("settingsSummaries", () => {
  it("camera connection hub summaries", () => {
    assert.equal(cameraConnectionSummary("connecting", "MiVue 866"), "Connecting…");
    assert.equal(cameraConnectionSummary("idle", undefined), "Camera unavailable");
    assert.equal(cameraConnectionSummary("connected", "MiVue 866"), "Connected · MiVue 866");
    assert.equal(cameraConnectionSummary("connected", undefined), "Connected");
    assert.equal(connectionHubKind("unstable"), "connected");
    assert.equal(connectionStatusLabel("connection_lost"), "Connection lost");
  });

  it("storage and maps summaries", () => {
    assert.equal(storageSummary(0, 0), "No local downloads");
    assert.match(storageSummary(23, 4.14 * 1024 * 1024 * 1024), /23 files/);
    assert.equal(mapsPreferenceSummary("online"), "Online map");
    assert.equal(mapsPreferenceSummary("schematic"), "Local schematic");
  });

  it("diagnostics summaries", () => {
    assert.equal(
      diagnosticsSummary({ hasEverTested: false, lastError: undefined, linkState: "idle" }),
      "Not tested",
    );
    assert.equal(
      diagnosticsSummary({
        hasEverTested: true,
        lastError: "timeout",
        linkState: "connection_lost",
      }),
      "Connection issue",
    );
    assert.equal(
      diagnosticsSummary({
        hasEverTested: true,
        lastError: undefined,
        linkState: "connected",
      }),
      "Last request: OK",
    );
    assert.equal(
      diagnosticsRequestStatus({ lastError: undefined, linkState: "connected" }),
      "OK",
    );
  });

  it("legal and about summaries", () => {
    assert.equal(
      legalSummary({ acceptedTermsVersion: undefined, termsAccepted: false }),
      "Terms not accepted",
    );
    assert.equal(
      legalSummary({ acceptedTermsVersion: "0.1-draft", termsAccepted: true }),
      "Terms accepted · 0.1-draft",
    );
    assert.equal(aboutVersionSummary("0.1.0"), "Version 0.1.0");
    assert.equal(transportLabel({ nativeTcpReady: false, isExpoGo: true }), "Expo Go");
  });
});
