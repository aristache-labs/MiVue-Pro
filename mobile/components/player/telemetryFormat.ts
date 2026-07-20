/** Telemetry display helpers — no NaN / Infinity / impossible negatives. */

export function formatSpeedParts(kmh: number | undefined): { value: string; unit: string } {
  if (kmh === undefined || !Number.isFinite(kmh) || kmh < 0) {
    return { value: "—", unit: "km/h" };
  }
  return { value: `${Math.round(kmh)}`, unit: "km/h" };
}

export function formatAltitudeParts(m: number | undefined): { value: string; unit: string } {
  if (m === undefined || !Number.isFinite(m)) {
    return { value: "—", unit: "m" };
  }
  // Impossible depths for dashcam road altitudes — still show finite negatives as —.
  if (m < -500 || m > 9000) return { value: "—", unit: "m" };
  return { value: m.toFixed(1).replace(".", ","), unit: "m" };
}

export function speedA11yLabel(kmh: number | undefined): string {
  const { value } = formatSpeedParts(kmh);
  if (value === "—") return "Speed unavailable";
  return `Speed ${value} kilometers per hour`;
}

export function altitudeA11yLabel(m: number | undefined): string {
  const { value } = formatAltitudeParts(m);
  if (value === "—") return "Altitude unavailable";
  const spoken = value.replace(",", ".");
  return `Altitude ${spoken} meters`;
}

export function cameraTimeA11yLabel(hhmmss: string): string {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/u.exec(hhmmss);
  if (!m) return `Camera time ${hhmmss}`;
  return `Camera time ${Number(m[1])} hours ${Number(m[2])} minutes ${Number(m[3])} seconds`;
}
