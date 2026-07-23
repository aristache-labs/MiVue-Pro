import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aboutVersionSummary,
  cameraConnectionSummary,
  cameraStatusTitle,
  connectionHubKind,
  connectionStatusLabel,
  diagnosticsRequestStatus,
  diagnosticsSummary,
  formatLastConnected,
  lastConnectedSummaryLine,
  legalSummary,
  mapsPreferenceSummary,
  storageSummary,
  transportLabel,
  visibleConnectionStatus,
} from "./settingsSummaries";

describe("settingsSummaries", () => {
  it("maps all surfaces to Connected / Connecting… / Disconnected only", () => {
    assert.equal(connectionStatusLabel("connected"), "Connected");
    assert.equal(connectionStatusLabel("connecting"), "Connecting…");
    assert.equal(connectionStatusLabel("disconnected"), "Disconnected");
    assert.equal(connectionStatusLabel("connection_lost"), "Disconnected");
    assert.equal(connectionStatusLabel("unstable"), "Disconnected");
    assert.equal(connectionStatusLabel("idle"), "Disconnected");
    assert.equal(visibleConnectionStatus("unstable"), "disconnected");
    assert.equal(connectionHubKind("unstable"), "disconnected");
    assert.equal(connectionHubKind("connected"), "connected");
  });

  it("camera connection hub summaries stay consistent across states", () => {
    assert.equal(
      cameraConnectionSummary("connecting", "MiVue 866", true),
      "Connecting… · MiVue 866",
    );
    assert.equal(
      cameraConnectionSummary("disconnected", "MiVue 866", true),
      "Not connected · MiVue 866",
    );
    assert.equal(
      cameraConnectionSummary("unstable", "MiVue 866", true),
      "Not connected · MiVue 866",
    );
    assert.equal(
      cameraConnectionSummary("connected", "MiVue 866", true),
      "Connected · MiVue 866",
    );
    assert.equal(cameraConnectionSummary("connected", undefined, false), "No camera configured");
    assert.equal(cameraConnectionSummary("idle", undefined, false), "No camera configured");
    assert.equal(cameraConnectionSummary("disconnected", undefined, true), "Not connected");
    assert.equal(cameraStatusTitle(true, "MiVue 866"), "MiVue 866");
    assert.equal(cameraStatusTitle(true, undefined), "Not connected");
    assert.equal(cameraStatusTitle(false, undefined), "No camera configured");
  });

  it("does not surface Unstable anywhere in status labels", () => {
    const labels = [
      connectionStatusLabel("unstable"),
      cameraConnectionSummary("unstable", "MiVue 866"),
      diagnosticsRequestStatus({ lastError: undefined, linkState: "unstable" }),
    ];
    for (const label of labels) {
      assert.equal(label.includes("Unstable"), false);
    }
  });

  it("formats Last connected without seconds and uses Today when appropriate", () => {
    const now = new Date(2026, 6, 23, 15, 0, 0);
    const todayIso = new Date(2026, 6, 23, 11, 59, 53).toISOString();
    const yesterdayIso = new Date(2026, 6, 22, 11, 59, 0).toISOString();
    assert.equal(formatLastConnected(todayIso, now), "Today, 11:59");
    assert.equal(/\d{2}:\d{2}:\d{2}/.test(formatLastConnected(todayIso, now)), false);
    assert.equal(formatLastConnected(yesterdayIso, now), "22 Jul, 11:59");
    assert.equal(lastConnectedSummaryLine(todayIso, now), "Last connected · Today, 11:59");
    assert.equal(formatLastConnected(undefined), "—");
  });

  it("failed live request maps to Disconnected, not stale Connected", () => {
    assert.equal(connectionStatusLabel("connection_lost"), "Disconnected");
    assert.equal(
      cameraConnectionSummary("connection_lost", "MiVue 866", true),
      "Not connected · MiVue 866",
    );
    assert.equal(visibleConnectionStatus("disconnected"), "disconnected");
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
