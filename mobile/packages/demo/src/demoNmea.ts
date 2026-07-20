/**
 * Synthetic NMEA for Demo Mode — fictional urban polygon, not a real trip.
 * Paired with DEMO260720-100000F.MP4.
 */

export const DEMO_NMEA_PATH = "/SD/Normal/F/DEMO260720-100000F.NMEA";
export const DEMO_NMEA_NAME = "DEMO260720-100000F.NMEA";

function checksum(body: string): string {
  let xor = 0;
  for (const char of body) xor ^= char.charCodeAt(0);
  return xor.toString(16).toUpperCase().padStart(2, "0");
}

function sentence(body: string): string {
  return `$${body}*${checksum(body)}`;
}

/** Convert decimal degrees to NMEA DDMM.MMMM / DDDMM.MMMM */
function toNmeaLat(lat: number): { value: string; hemi: "N" | "S" } {
  const hemi = lat >= 0 ? "N" : "S";
  const abs = Math.abs(lat);
  const deg = Math.floor(abs);
  const minutes = (abs - deg) * 60;
  return { value: `${String(deg).padStart(2, "0")}${minutes.toFixed(4).padStart(7, "0")}`, hemi };
}

function toNmeaLon(lon: number): { value: string; hemi: "E" | "W" } {
  const hemi = lon >= 0 ? "E" : "W";
  const abs = Math.abs(lon);
  const deg = Math.floor(abs);
  const minutes = (abs - deg) * 60;
  return { value: `${String(deg).padStart(3, "0")}${minutes.toFixed(4).padStart(7, "0")}`, hemi };
}

/** ~60 samples over a square loop (fictional). */
export function buildDemoNmea(): string {
  const baseLat = 45.0;
  const baseLon = 25.0;
  const step = 0.0004;
  const corners: Array<[number, number]> = [
    [baseLat, baseLon],
    [baseLat + step, baseLon],
    [baseLat + step, baseLon + step],
    [baseLat, baseLon + step],
    [baseLat, baseLon],
  ];

  const lines: string[] = [];
  const pointsPerEdge = 12;
  let second = 0;

  for (let edge = 0; edge < corners.length - 1; edge += 1) {
    const [lat0, lon0] = corners[edge]!;
    const [lat1, lon1] = corners[edge + 1]!;
    for (let i = 0; i < pointsPerEdge; i += 1) {
      const t = i / pointsPerEdge;
      const lat = lat0 + (lat1 - lat0) * t;
      const lon = lon0 + (lon1 - lon0) * t;
      const la = toNmeaLat(lat);
      const lo = toNmeaLon(lon);
      const hh = String(Math.floor(second / 3600)).padStart(2, "0");
      const mm = String(Math.floor((second % 3600) / 60)).padStart(2, "0");
      const ss = String(second % 60).padStart(2, "0");
      const time = `${hh}${mm}${ss}.00`;
      const date = "200726"; // 20 Jul 2026
      const alt = (90 + i * 0.2).toFixed(1);
      const speedKnots = (18 + (i % 5)).toFixed(1);
      const course = ((edge * 90) % 360).toFixed(1);

      lines.push(
        sentence(`GPGGA,${time},${la.value},${la.hemi},${lo.value},${lo.hemi},1,08,1.0,${alt},M,0.0,M,,`),
      );
      lines.push(
        sentence(
          `GPRMC,${time},A,${la.value},${la.hemi},${lo.value},${lo.hemi},${speedKnots},${course},${date},,,A`,
        ),
      );
      second += 1;
    }
  }

  return `${lines.join("\n")}\n`;
}

export const DEMO_NMEA_BODY = buildDemoNmea();
