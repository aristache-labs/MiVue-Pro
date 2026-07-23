/**
 * Generates mobile/generated/thirdPartyLicenses.json from package-lock.json
 * and installed LICENSE files. Run via: npm run licenses:generate
 *
 * Does not invent licenses. Packages without license metadata are listed as blockers.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const LOCK_PATH = path.join(ROOT, "package-lock.json");
const OUT_DIR = path.join(ROOT, "generated");
const OUT_JSON = path.join(OUT_DIR, "thirdPartyLicenses.json");
const OUT_TS = path.join(OUT_DIR, "thirdPartyLicenses.ts");

const LICENSE_FILE_CANDIDATES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENCE",
  "LICENCE.md",
  "license",
  "license.md",
  "COPYING",
  "COPYING.md",
];

const NOTICE_CANDIDATES = ["NOTICE", "NOTICE.txt", "NOTICE.md"];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function tryRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function findFirstFile(dir, names) {
  for (const name of names) {
    const full = path.join(dir, name);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return undefined;
}

function normalizeLicenseField(license) {
  if (!license) return undefined;
  if (typeof license === "string") return license;
  if (typeof license === "object" && typeof license.type === "string") return license.type;
  if (Array.isArray(license)) {
    return license
      .map((item) => (typeof item === "string" ? item : item?.type))
      .filter(Boolean)
      .join(" OR ");
  }
  return undefined;
}

function packageNameFromNodeModulesPath(key) {
  // "node_modules/foo" | "node_modules/@scope/name" | "node_modules/a/node_modules/b"
  const marker = "node_modules/";
  const idx = key.lastIndexOf(marker);
  if (idx < 0) return key;
  return key.slice(idx + marker.length);
}

function collectProductionKeys(lock) {
  const packages = lock.packages || {};
  const keys = Object.keys(packages).filter((k) => k.startsWith("node_modules/"));
  return keys.filter((key) => {
    const entry = packages[key];
    if (!entry) return false;
    if (entry.dev === true || entry.devOptional === true) return false;
    // Skip nested optional peer-only stubs without version when empty
    return true;
  });
}

function resolvePackageDir(lockKey) {
  // Prefer the path implied by the lock key under mobile/
  const candidate = path.join(ROOT, lockKey);
  if (fs.existsSync(candidate)) return candidate;
  // file: local modules
  if (lockKey === "node_modules/http10-tcp") {
    const local = path.join(ROOT, "modules", "http10-tcp");
    if (fs.existsSync(local)) return local;
  }
  return candidate;
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

function buildArtifact() {
  if (!fs.existsSync(LOCK_PATH)) {
    console.error("Missing package-lock.json");
    process.exit(1);
  }

  const lock = readJson(LOCK_PATH);
  const appPkg = readJson(path.join(ROOT, "package.json"));
  const lockHash = hashFile(LOCK_PATH);
  const productionKeys = collectProductionKeys(lock);
  const licenseTexts = new Map();
  const packages = [];
  const blockers = [];

  for (const key of productionKeys.sort()) {
    const entry = lock.packages[key] || {};
    const name = packageNameFromNodeModulesPath(key);
    const version = entry.version || "0.0.0";
    const pkgDir = resolvePackageDir(key);
    const pkgJsonPath = path.join(pkgDir, "package.json");
    const pkgJson = fs.existsSync(pkgJsonPath) ? readJson(pkgJsonPath) : {};

    let licenseId =
      normalizeLicenseField(pkgJson.license) ||
      normalizeLicenseField(entry.license) ||
      undefined;

    const licenseFile = findFirstFile(pkgDir, LICENSE_FILE_CANDIDATES);
    const noticeFile = findFirstFile(pkgDir, NOTICE_CANDIDATES);
    let licenseText = licenseFile ? tryRead(licenseFile) : undefined;
    const noticeText = noticeFile ? tryRead(noticeFile) : undefined;

    // Local proprietary-or-unspecified module: do not invent MIT
    if (name === "http10-tcp" && !licenseId) {
      blockers.push({
        name,
        version,
        reason:
          "http10-tcp has no license field in package.json. Clarify proprietary Laneory code vs open-source before release. Do not assume MIT.",
      });
      licenseId = "UNLICENSED / unspecified — release blocker";
      licenseText =
        licenseText ||
        "LICENSE METADATA MISSING. http10-tcp is a local module (file:./modules/http10-tcp) without a declared SPDX license. Treat as a release blocker until ownership and licence terms are documented.";
    }

    if (!licenseId) {
      blockers.push({
        name,
        version,
        reason: "Missing license identifier in package metadata",
      });
      licenseId = "UNKNOWN";
    }

    if (!licenseText || !licenseText.trim()) {
      if (licenseTexts.has(licenseId)) {
        licenseText = licenseTexts.get(licenseId);
      } else {
        blockers.push({
          name,
          version,
          reason: `Missing license text file for ${licenseId}`,
        });
        licenseText = `License text not found on disk for ${name}@${version} (${licenseId}).`;
      }
    } else if (!licenseTexts.has(licenseId)) {
      licenseTexts.set(licenseId, licenseText);
    }

    const copyrightMatch = licenseText.match(/Copyright[^\n]*/i);
    packages.push({
      name,
      version,
      license: licenseId,
      copyright: copyrightMatch ? copyrightMatch[0].trim() : undefined,
      homepage: typeof pkgJson.homepage === "string" ? pkgJson.homepage : undefined,
      repository:
        typeof pkgJson.repository === "string"
          ? pkgJson.repository
          : typeof pkgJson.repository?.url === "string"
            ? pkgJson.repository.url
            : undefined,
      licenseTextKey: licenseId,
      notice: noticeText ? noticeText.trim() : undefined,
      path: key,
    });
  }

  const mapAttribution = {
    title: "Map and data attribution",
    lines: [
      "Map data © OpenStreetMap contributors",
      "Leaflet 1.9.4 is loaded from a public CDN inside the Online map WebView (not installed via npm in this mobile app).",
      "OpenStreetMap tile/CDN terms and privacy practices apply when Online map is selected.",
    ],
  };

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    appName: "Laneory",
    appVersion: appPkg.version || "0.1.0",
    lockfile: "package-lock.json",
    lockfileSha256Prefix: lockHash,
    packageCount: packages.length,
    legalReviewRequired: true,
    draftBanner: "DRAFT · Legal review required",
    blockers,
    mapAttribution,
    packages,
    licenseTexts: Object.fromEntries(licenseTexts),
  };
}

function writeArtifact(artifact) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    OUT_TS,
    `/* eslint-disable */\n/** Auto-generated by scripts/generate-third-party-licenses.cjs — do not edit. */\nexport type ThirdPartyLicensePackage = {\n  readonly name: string;\n  readonly version: string;\n  readonly license: string;\n  readonly copyright?: string;\n  readonly homepage?: string;\n  readonly repository?: string;\n  readonly licenseTextKey: string;\n  readonly notice?: string;\n  readonly path: string;\n};\n\nexport type ThirdPartyLicensesArtifact = {\n  readonly schemaVersion: number;\n  readonly generatedAt: string;\n  readonly appName: string;\n  readonly appVersion: string;\n  readonly lockfile: string;\n  readonly lockfileSha256Prefix: string;\n  readonly packageCount: number;\n  readonly legalReviewRequired: boolean;\n  readonly draftBanner: string;\n  readonly blockers: readonly { readonly name: string; readonly version: string; readonly reason: string }[];\n  readonly mapAttribution: { readonly title: string; readonly lines: readonly string[] };\n  readonly packages: readonly ThirdPartyLicensePackage[];\n  readonly licenseTexts: Readonly<Record<string, string>>;\n};\n\nconst artifact = ${JSON.stringify(artifact)} as ThirdPartyLicensesArtifact;\nexport default artifact;\nexport const thirdPartyLicenses = artifact;\n`,
    "utf8",
  );

  console.log(
    `Wrote ${artifact.packageCount} packages, ${artifact.blockers.length} blockers → ${path.relative(ROOT, OUT_JSON)}`,
  );
  if (artifact.blockers.length) {
    console.warn("Release blockers / incomplete metadata:");
    for (const b of artifact.blockers.slice(0, 20)) {
      console.warn(` - ${b.name}@${b.version}: ${b.reason}`);
    }
    if (artifact.blockers.length > 20) {
      console.warn(` …and ${artifact.blockers.length - 20} more`);
    }
  }
}

function checkArtifact(artifact) {
  const existing = readJson(OUT_JSON);
  let failed = false;
  if (existing.lockfileSha256Prefix !== artifact.lockfileSha256Prefix) {
    console.error(
      `Artifact lockfile hash mismatch: ${existing.lockfileSha256Prefix} vs ${artifact.lockfileSha256Prefix}. Run npm run licenses:generate.`,
    );
    failed = true;
  }
  if (existing.packageCount !== artifact.packageCount) {
    console.error(
      `Package count mismatch: ${existing.packageCount} vs ${artifact.packageCount}. Run npm run licenses:generate.`,
    );
    failed = true;
  }
  const critical = artifact.blockers.filter((b) => b.name === "http10-tcp");
  if (critical.length === 0) {
    console.error("Expected http10-tcp to be listed as a licence metadata blocker.");
    failed = true;
  }
  if (artifact.blockers.length > 0) {
    console.warn(
      `Validation notes ${artifact.blockers.length} incomplete licence metadata entr(y/ies) — release gate until resolved.`,
    );
  }
  if (failed) process.exit(1);
  console.log("License artifact matches current lockfile hash and package count.");
}

const artifact = buildArtifact();
if (process.argv.includes("--check")) {
  if (!fs.existsSync(OUT_JSON)) {
    console.error("Missing generated/thirdPartyLicenses.json — run npm run licenses:generate");
    process.exit(1);
  }
  checkArtifact(artifact);
} else {
  writeArtifact(artifact);
}
