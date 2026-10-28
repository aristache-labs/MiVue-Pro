<div align="center">

<img src="mobile/assets/brand/laneory-mark-icon.png" width="76" alt="Laneory">

# Laneory · Dashcam Companion

<em>Mobile app · Local dashboard · TypeScript CLI.</em>

<br />

<a href="https://github.com/pateutz1/MiVue-Pro">github.com/pateutz1/MiVue-Pro</a>

<br />

<img src="showcase/Laneory%20%C2%B7%20Prezentare%401x.png" width="100%" alt="Laneory mobile app and dashboard">

<br />

![Build](https://shields.io/github/actions/workflow/status/pateutz1/MiVue-Pro/build-sidestore-ios.yml?style=flat-square&label=iOS%20build&labelColor=0f6e68)
![Stars](https://shields.io/github/stars/pateutz1/MiVue-Pro?style=flat-square&labelColor=0f6e68&color=76f5e1)
![Contributors](https://shields.io/github/contributors/pateutz1/MiVue-Pro?style=flat-square&labelColor=0f6e68&color=76f5e1)
![Last commit](https://shields.io/github/last-commit/pateutz1/MiVue-Pro?style=flat-square&labelColor=0f6e68&color=76f5e1)
![Issues](https://shields.io/github/issues/pateutz1/MiVue-Pro?style=flat-square&labelColor=0f6e68&color=76f5e1)
![Watchers](https://shields.io/github/watchers/pateutz1/MiVue-Pro?style=flat-square&labelColor=0f6e68&color=76f5e1)

<strong>Local-first &middot; Wi-Fi connection &middot; Recording library &middot; Download queue &middot; GPS routes</strong><br>
<sub>Model and firmware support is tracked in the <a href="docs/compatibility.md">compatibility registry</a>. CLI checks: <code>npm run check</code>. Mobile checks: <code>npm run typecheck</code>, <code>npm test</code>, and <code>npm run licenses:check</code> from <code>mobile/</code>.</sub>

<br />

[Stack](#stack) &middot; [The app](#the-app) &middot; [Local setup](#local-setup) &middot; [Local dashboard](#local-dashboard) &middot; [Deployment](#deployment)

<sub><b>AI agents / LLMs:</b> repository conventions and protocol validation rules live in <a href="AGENTS.md"><code>AGENTS.md</code></a>.</sub>

</div>

---

## Overview

Laneory is an independent dashcam companion for iOS and Android, with a local web dashboard and a TypeScript CLI. It connects to a legally owned camera over Wi-Fi to browse recordings, download videos and photos, play saved footage, and explore GPS routes extracted from NMEA telemetry. The mobile app includes a demo mode with synthetic data, a persistent download queue, local media management, and camera settings gated by model and firmware capabilities. Files and preferences stay local by default; online maps are optional.

The tested camera is the Mio MiVue 866 with firmware `VI100.24.50.BE1WD.10`. Compatibility with other models or firmware is not implied. Laneory is independent and is not affiliated with or endorsed by Mio/MiTAC.

## Table of Contents

- [Laneory · Dashcam Companion](#laneory--dashcam-companion)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Stack](#stack)
  - [The app](#the-app)
  - [Architecture overview](#architecture-overview)
  - [Prerequisites](#prerequisites)
  - [Local setup](#local-setup)
    - [1. Clone and install](#1-clone-and-install)
    - [2. Camera connection](#2-camera-connection)
    - [3. Mobile setup](#3-mobile-setup)
    - [4. Validation](#4-validation)
    - [5. Run the CLI or dashboard](#5-run-the-cli-or-dashboard)
  - [Commands](#commands)
  - [Local dashboard](#local-dashboard)
  - [Deployment](#deployment)
  - [Contributing](#contributing)
  - [Contributors](#contributors)
  - [License](#license)
  - [Support the project](#support-the-project)
  - [Connect](#connect)

---

## Stack

| Layer | Technology |
| --- | --- |
| Mobile framework | React Native 0.86 + Expo 57, prebuild / development builds |
| UI library | React 19 |
| Language | TypeScript |
| Navigation | Expo Router |
| Lists | Shopify FlashList |
| Animation | React Native Reanimated |
| Typography | Source Sans 3, IBM Plex Mono |
| Media | Expo Video, FileSystem, Sharing, Video Thumbnails |
| Local preferences | AsyncStorage |
| Maps | Leaflet / OpenStreetMap, optional online tiles |
| Camera transport | Shared contracts and local native modules, including HTTP/1.0 TCP |
| CLI / dashboard | Node.js 20+, tsx, browser JavaScript |
| Tests | Node.js test runner + tsx |
| Distribution | EAS Build / EAS Update |
| Package manager | npm |

---

## The app

1. **Connection** — onboarding, discovery, manual host configuration, and visible connection state.
2. **Library** — Normal, Event, Parking, and Photo recordings with thumbnails, filters, sorting, and multi-selection.
3. **Downloads** — persistent queue, progress, and one active camera transfer at a time. Selecting a recording does not start a download.
4. **Local media** — offline playback, sharing, and local storage management.
5. **GPS routes** — NMEA telemetry, statistics, synchronized playback, offline schematic routes, and optional online maps.
6. **Camera settings** — supported settings and maintenance actions through centralized validation and verification.
7. **Demo mode** — synthetic recordings and simulated downloads without a physical camera.

Remote video playback remains an internal preview feature pending physical playback and seek validation on iOS and Android. Live-view RTSP is unavailable on the tested firmware. See [compatibility](docs/compatibility.md) for feature-specific status.

---

## Architecture overview

- **Mobile app** — Expo Router screens in `mobile/app/`, feature components, hooks, and packages. See [mobile architecture](docs/mobile/architecture.md).
- **Protocol** — parsers, request structures, and capability validation stay separate from UI. [Protocol documentation](docs/protocol.md) distinguishes `apk-observed`, `camera-confirmed`, and `production-validated` behavior.
- **CLI and dashboard** — TypeScript services in `src/` and browser assets in `web/`, separate from mobile.
- **Mutations** — `src/cameraMutate.ts` and the mobile equivalent centralize identity, firmware, capability, target, audit, and post-execution checks. Destructive requests do not inherit generic read retries.
- **Downloads** — CLI transfers stream to `.part` files and rename after size validation. Existing files are not overwritten. Mobile uses its own persistent queue.
- **GPS** — checksum-validated NMEA parsing and GPX export. The schematic route stays local; online tiles are opt-in.
- **Analysis boundary** — APK/XAPK, decompiled materials, raw traffic, and analysis databases stay outside Git and releases. Product functionality is independently implemented.

---

## Prerequisites

- **Node.js 20 or newer** and npm for the CLI.
- A legally owned, supported camera and a computer or phone connected to its Wi-Fi for physical tests.
- Optional Ethernet for simultaneous internet access on the computer.
- For mobile development, the project's Expo toolchain and a development build containing its native modules. Expo Go is limited to demo and fetch-probe workflows.

The tested setup assigned `192.72.1.100` to the laptop and used `192.72.1.1` as the gateway. An IP address alone does not identify a camera.

---

## Local setup

### 1. Clone and install

```powershell
git clone https://github.com/pateutz1/MiVue-Pro.git
cd MiVue-Pro
npm install
```

### 2. Camera connection

Connect to the camera's Wi-Fi, then inspect it:

```powershell
npm run dev -- discover
npm run dev -- info --host 192.72.1.1
```

Use the detected host if it differs. Mutation workflows also verify identity, model, firmware, session, and capabilities.

### 3. Mobile setup

Install mobile dependencies separately:

```powershell
cd mobile
npm install
```

See [mobile setup](mobile/README.md) and the [framework decision](docs/mobile/adr-001-framework.md). Native camera transport requires a build containing the corresponding modules.

### 4. Validation

From the repository root:

```powershell
npm run check
```

From `mobile/`:

```powershell
npm run typecheck
npm test
npm run licenses:check
```

### 5. Run the CLI or dashboard

From the repository root:

```powershell
npm run dev -- list --host 192.72.1.1 --count 5
npm run dev -- list --host 192.72.1.1 --category parking --json
npm run dev -- list --host 192.72.1.1 --all --summary
npm run dev -- download /SD/Parking/F/PARK260716-033609F.MP4 --host 192.72.1.1 --output ./downloads
npm run dev -- gpx ./downloads/PARK260716-033609F.NMEA
npm run dev -- web --host 192.72.1.1
```

The download path is an example; select an existing file from your camera's listing. The dashboard opens at [http://127.0.0.1:4173](http://127.0.0.1:4173).

---

## Commands

| Command | Description |
| --- | --- |
| `npm run dev -- discover` | Discover cameras on local IPv4 interfaces |
| `npm run dev -- discover --debug` | Show connection diagnostics |
| `npm run dev -- info --host <host>` | Read status and confirmed information |
| `npm run dev -- list --host <host> --all --summary` | List all pages and summarize |
| `npm run dev -- download <camera-path> --host <host> --output ./downloads` | Download with progress and size validation |
| `npm run dev -- gpx <local-file.NMEA>` | Convert local NMEA to GPX |
| `npm run dev -- web --host <host>` | Start the local dashboard |
| `npm run build` | Compile root TypeScript |
| `npm test` | Run root tests |
| `npm run check` | Build and run root tests |
| `npm run typecheck` (in `mobile/`) | Check mobile TypeScript |
| `npm test` (in `mobile/`) | Run mobile tests |
| `npm run licenses:check` (in `mobile/`) | Check third-party license data |

Consult [protocol](docs/protocol.md) and [AGENTS.md](AGENTS.md) before executing mutation or maintenance operations.

---

## Local dashboard

The dashboard listens exclusively on the loopback interface at `http://127.0.0.1:4173`.

- Browse thumbnails, filter by category, camera, duration, and date, or sort by date, time, duration, size, and name.
- Start downloads explicitly from a recording or multi-selection. Follow real progress and completion notifications.
- Manage local favorites, view download storage usage, and open the folder in Explorer.
- Play recordings with AAC audio and synchronized GPS routes. The schematic route stays local; OpenStreetMap is optional.
- Listings are cached for about 25 seconds; Reload forces refresh. Thumbnails use a two-request pool and disk/memory caching. Large lists use virtualization.

Keep `downloads/` outside OneDrive synchronization when possible. Camera firmware can disable Wi-Fi; software cannot reactivate the physical access point. Full listing has a 10,000-file safety limit. CLI downloads do not automatically resume; Range and preview validation are tracked in [compatibility](docs/compatibility.md).

Details: [dashboard](docs/dashboard.md), [troubleshooting](docs/troubleshooting.md), [research](docs/research-notes.md), and [security](docs/security-and-legal.md).

---

## Deployment

The CLI and dashboard run locally. Mobile distribution uses `mobile/eas.json`:

| Profile / channel | Purpose |
| --- | --- |
| `development` | Internal development client with native modules |
| `preview` | Internal distribution and validated OTA updates |
| `production` | Release target requiring explicit authorization |

Validated OTA-compatible JavaScript, TypeScript, and asset changes use the `preview` branch. Native code, Expo plugins, permissions, entitlements, or native dependency changes require a compatible new build.

The manual [Build iOS for SideStore](https://github.com/pateutz1/MiVue-Pro/actions/workflows/build-sidestore-ios.yml) workflow is also present. Store submission requires explicit approval, trademark clearance, and the [release legal checklist](docs/legal/release-legal-checklist.md). See [store listing drafts](docs/mobile/store-listing.md) and [trademark usage](docs/legal/trademark-usage.md).

---

## Contributing

Bugs and ideas go to [Issues][issues]. Read [AGENTS.md](AGENTS.md), [protocol](docs/protocol.md), and [compatibility](docs/compatibility.md) before changing camera behavior. Include relevant unit and mocked integration tests, and document physical validation separately.

Keep analysis materials, credentials, raw traffic, downloads, and build outputs out of commits and releases. New capabilities must document validation, timeouts, retries, audit, and verification before being described as production-ready.

## Contributors

Thanks to everyone who has contributed to Laneory.

<a href="https://github.com/pateutz1/MiVue-Pro/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pateutz1/MiVue-Pro" alt="Contributors" />
</a>

## License

No root `LICENSE` file is currently provided. Do not assume an MIT or other open-source license. Third-party notices and release requirements are tracked in the legal documentation and mobile license tooling.

## Support the project

Report reproducible bugs, share model and firmware test results from your own camera, or suggest improvements through [Issues][issues]. Star the [repository][repo] to follow development.

## Connect

<div align="center">

**Adrian Cristache** · [aristache.dev](https://www.aristache.dev)

<a href="https://github.com/pateutz1/MiVue-Pro"><img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" /></a>
<a href="https://www.aristache.dev"><img src="https://img.shields.io/badge/Site-0f6e68?style=for-the-badge&logo=googlechrome&logoColor=white" alt="aristache.dev" /></a>

</div>

[repo]: https://github.com/pateutz1/MiVue-Pro
[issues]: https://github.com/pateutz1/MiVue-Pro/issues
