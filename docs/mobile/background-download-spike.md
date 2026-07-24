# Background download spike (Stage 0) — MiVue 866 feasibility

**Status:** experimental harness only — **not** production, **not** wired to Download Queue.  
**iOS spike code:** kept intact, Diagnostics panel **off by default**.

## Gate verdict (iOS)

| Field | Value |
|---|---|
| **Recorded verdict** | **`BLOCKED — physical-device signing unavailable`** |
| Meaning | No paid Apple Developer membership; agent/workstation is Windows — cannot install an iOS development build on a physical iPhone to run the URLSession.background harness against MiVue 866 |
| Not | `fail` — camera compatibility is **untested**, not disproven |
| Not | license to proceed with Etapa 1 / Etapa 2 iOS production integration |

**Rules while blocked**

- Keep Stage 0 iOS module, plugin, Diagnostics UI, and this doc.
- Do **not** delete or gut the spike.
- Do **not** treat an Android Stage 0B result as proof for iOS.
- Do **not** start Etapa 1 (TS production coordinator) or Etapa 2 (DownloadQueue iOS handoff) until this gate is re-run on device and becomes `pass` or an explicit `partial` with documented limits.

When Apple signing + a device build become available, clear the device checklist below and replace this verdict with `pass` | `partial` | `fail`.

---

## Purpose (iOS Stage 0)

Measure whether `URLSessionConfiguration.background` can download a real camera file over the local Wi‑Fi AP while the app is suspended, wait through connectivity loss without becoming a definitive failure, and restore the native task after process relaunch.

Do **not** use raw TCP in background. Do **not** claim production readiness from this spike.

## Requirements to run (when unblocked)

1. iOS **development build** after `expo prebuild` / EAS build that includes:
   - dependency `background-download-spike`
   - plugin `./plugins/withBackgroundDownloadSpike.js`
2. Expo Go / OTA-only update: **insufficient** (native module missing → UI shows unavailable).
3. Settings → Diagnostics (internal tools) → enable **Background download spike** (off by default).
4. Phone on camera Wi‑Fi; host from the app session (typically `192.72.1.1`).
5. Remote path under `/SD/…` for a real file; optional expected byte size (e.g. ~371 MB).

Session identifier (stable): `app.laneory.mobile.bg-download-spike`  
Info.plist keys set by plugin: `LaneoryBackgroundDownloadSpikeSessionId`, `LaneoryBackgroundDownloadSpikeNote`.

AppDelegate completion: `BackgroundDownloadSpikeAppDelegateSubscriber` via `expo-module.config.json` `appDelegateSubscribers` (Expo forwards `handleEventsForBackgroundURLSession`).

## Device checklist (1–10) — pending (blocked)

| # | Step | Result | Notes |
|---|---|---|---|
| 1 | Download starts in foreground | blocked | |
| 2 | App backgrounds; transfer continues | blocked | |
| 3 | Camera Wi‑Fi interrupted | blocked | |
| 4 | Task stays waiting — not definitive Failed | blocked | |
| 5 | Phone returns to camera network | blocked | |
| 6 | Transfer resumes automatically or controlled restart | blocked | |
| 7 | Foreground recovers native task | blocked | |
| 8 | Final file size correct | blocked | |
| 9 | No duplicate bytes | blocked | |
| 10 | Document HTTP below | blocked | |

## Extra cases — pending (blocked)

| Case | Result | Notes |
|---|---|---|
| URLSession speaks to camera HTTP stack | blocked | |
| HTTP/1.1 incompatibility symptoms | blocked | |
| Redirects / missing headers | blocked | |
| Local network access while backgrounded | blocked | |
| Suspend vs system terminate vs **force-quit** | blocked | force-quit: **not** guaranteed |
| ~371 MB long enough in background | blocked | |

## HTTP observed — pending (blocked)

| Field | Observed |
|---|---|
| Method | `GET` (spike sends full GET; **no** `Range` request header) |
| Status | blocked |
| `Content-Length` | blocked |
| `Accept-Ranges` | blocked (do not assume `bytes`) |
| `Content-Type` | blocked |
| `Server` | blocked |
| Other safe headers | blocked |
| 206 Partial Content seen? | blocked — spike does not send Range |

## Gate outcomes (when device test is possible)

| Verdict | Meaning | Next step |
|---|---|---|
| **pass** | Foreground start + background continue + waiting on drop + recover + size OK, no duplicate bytes | Proceed to Etapa 1 (TS contract) |
| **partial** | Some steps work; document limits + fallback | **Do not** build full iOS queue background integration yet |
| **fail** | URLSession.background unusable with this camera | **Stop** iOS background full impl; do not ship a fake abstraction |
| **BLOCKED** (current) | Cannot sign/install iOS dev build | Keep spike; optional Stage 0B Android only |

## Guarantees / non-guarantees (Stage 0 iOS)

**Can:** isolated native harness + Diagnostics UI + redacted logs + unit tests for URL helpers.  
**Cannot yet:** production continuity, DownloadQueue handoff, proven camera compatibility, Range resume, force-quit survival.  
**Needs:** native rebuild (prebuild/EAS) **and** physical device install with valid signing.

## Files (Stage 0 iOS — retained)

- `mobile/modules/background-download-spike/`
- `mobile/plugins/withBackgroundDownloadSpike.js`
- `mobile/components/settings/BackgroundDownloadSpikePanel.tsx`
- `mobile/app/settings/diagnostics.tsx` (panel mount)
- `mobile/app.json`, `mobile/package.json`

## Related

- Proposed Android-only feasibility: [background-download-spike-android-0b.md](./background-download-spike-android-0b.md) — **proposal only until approved**; not evidence for iOS.
