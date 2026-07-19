# ADR-001 — Alegerea framework-ului mobil

**Statut:** Acceptat — React Native + Expo (prebuild / development builds)  
**Data:** 20 iulie 2026  
**Acceptat de titular:** 20 iulie 2026 („React cu Expo”)  
**SDK pentru Expo Go (App Store):** **54** (`expo ~54.0.35`) — App Store Expo Go nu livra încă SDK 55+ la data downgrade-ului; producția rămâne pe development builds.  
**Produs:** `Laneory`

## 1. Context

Aplicația trebuie să vorbească pe Wi‑Fi local cu un server embedded care:

- răspunde fiabil la HTTP/1.0 peste TCP (HTTP/1.1 Node a eșuat pe dispozitivul testat);
- nu gestionează bine operațiile concurente → un singur transfer activ;
- livrează MP4 mari + sidecar NMEA;
- nu are suport `Range` confirmat;
- pe firmware-ul testat nu publică live-view RTSP.

Cerințe de produs: coadă persistentă, player local, hartă opțională, Demo Mode, iOS + Android, local-first. Codul existent este TypeScript (`src/protocol`, transport, NMEA).

## 2. Opțiuni evaluate

### A. React Native — bare workflow

Control nativ maxim; cost de boilerplate mai mare decât Expo CNG. Rămâne alternativă dacă Expo prebuild blochează TCP/FGS.

### B. Flutter

Rescriere protocol în Dart; respins ca default (cost fără reuse TS).

### C. Kotlin Multiplatform + SwiftUI + Jetpack Compose

Cost maxim; respins ca default.

### D. React Native + Expo (prebuild / development builds) — ALEASĂ

| Criteriu | Evaluare |
|---|---|
| Reutilizare TypeScript | ridicată pentru protocol/parser/NMEA |
| Tooling | Expo Router, EAS, config plugins, CNG |
| HTTP/1.0 / TCP raw | necesită **development build** + modul nativ sau socket custom; **nu** Expo Go ca țintă producție |
| Download lung | FGS/config nativă via prebuild; limite iOS documentate onest |
| Player / hărți | expo-av / playere native; MapLibre via dev build |
| Cost echipă | bun față de bare pur, păstrând escape hatch nativ |

**Expo Go / Managed-only:** exclus ca țintă de producție — limitează TCP raw, cleartext fin, background transfer și module media.

## 3. Decizie acceptată

**React Native + Expo cu `expo prebuild` și development builds (CNG).**

„React cu Expo” înseamnă:

1. Proiect Expo TypeScript în `mobile/`.
2. Generare `ios/` / `android/` prin prebuild când e nevoie de native.
3. Rulare pe device prin development build (`expo run:*` / EAS) — **de către utilizator**, nu agent.
4. Module native pentru TCP HTTP/1.0 când `fetch`/Expo Go nu sunt suficiente.
5. Păstrarea TypeScript pentru `packages/protocol` și `packages/parsers`.

## 4. Consecințe

- Monorepo: `mobile/` Expo app + `mobile/packages/*`.
- Transportul Node (`node:net`, `node:fs`) **nu** se importează.
- `cameraMutate` / `probe` nu intră în tree.
- Prototype gate: HTTP/1.0 GET pe device fizic după prebuild; Demo Mode fără trafic cameră.

## 5. Alternative respinse pentru MVP

| Opțiune | Motiv |
|---|---|
| Expo Go ca runtime producție | fără garanție TCP/cleartext/FGS/module custom |
| RN bare fără Expo | respins de titular în favoarea Expo tooling |
| Flutter / KMP | cost rescriere |

## 6. Referințe

- [phase0-audit.md](phase0-audit.md)
- [architecture.md](architecture.md)
- [license-plan.md](license-plan.md)
- [../protocol.md](../protocol.md)
- [../compatibility.md](../compatibility.md)
