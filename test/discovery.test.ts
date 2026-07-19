import assert from "node:assert/strict";
import test from "node:test";
import { generateCandidateHosts } from "../src/discovery/discoverCamera.js";

test("candidate generation derives the gateway from the Wi-Fi subnet", () => {
  const candidates = generateCandidateHosts({
    "Wi-Fi": [
      {
        address: "192.72.1.100",
        netmask: "255.255.255.0",
        family: "IPv4",
        mac: "00:00:00:00:00:00",
        internal: false,
        cidr: "192.72.1.100/24",
        scopeid: 0,
      },
    ],
  });
  assert.ok(candidates.includes("192.72.1.1"));
  assert.ok(candidates.includes("192.72.1.254"));
});
