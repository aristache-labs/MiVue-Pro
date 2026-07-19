import assert from "node:assert/strict";
import test from "node:test";
import { NmeaParseError, parseNmeaTelemetry, telemetryToGpx } from "../src/nmea";

test("NMEA telemetry becomes a GPX track point with app namespace", () => {
  const raw = [
    "$GPGGA,120000.00,4500.00000,N,02500.00000,E,1,08,0.9,100.0,M,0.0,M,,*59",
    "$GPRMC,120000.00,A,4500.00000,N,02500.00000,E,10.000,90.0,010126,,,A*57",
  ].join("\r\n");
  const samples = parseNmeaTelemetry(raw);
  assert.equal(samples.length, 1);
  assert.equal(samples[0]?.latitude, 45);
  const gpx = telemetryToGpx(samples, "test.NMEA");
  assert.match(gpx, /creator="\[NUMELE_APLICAȚIEI\]"/);
  assert.match(gpx, /xmlns:app=/);
  assert.doesNotMatch(gpx, /MiVue/);
});

test("NMEA parser rejects invalid checksums", () => {
  assert.throws(
    () => parseNmeaTelemetry("$GPRMC,120000.00,A,4500.00000,N,02500.00000,E,0,0,010126,,,A*00"),
    NmeaParseError,
  );
});
