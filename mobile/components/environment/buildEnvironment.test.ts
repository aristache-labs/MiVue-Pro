import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { areInternalToolsEnabled } from "./buildEnvironment";

describe("areInternalToolsEnabled", () => {
  it("enables for development channel", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "development",
      }),
      true,
    );
  });

  it("enables for preview channel", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "preview",
      }),
      true,
    );
  });

  it("enables for Expo Go", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "expo",
        updatesChannel: "production",
      }),
      true,
    );
  });

  it("enables for __DEV__", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: true,
        appOwnership: "standalone",
        updatesChannel: "production",
      }),
      true,
    );
  });

  it("disables for production channel", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "production",
      }),
      false,
    );
  });

  it("enables when a release binary did not embed a channel", () => {
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: undefined,
      }),
      true,
    );
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: null,
        updatesChannel: null,
      }),
      true,
    );
    assert.equal(
      areInternalToolsEnabled({
        isDev: false,
        appOwnership: "standalone",
        updatesChannel: "  ",
      }),
      true,
    );
  });
});
