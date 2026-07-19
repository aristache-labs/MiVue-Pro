# ADR-001 — Alegerea framework-ului mobil

**Statut:** propus (preferință tehnică; decizie formală a titularului înainte de Faza 2)  
**Data:** 20 iulie 2026  
**Produs:** `[NUMELE_APLICAȚIEI]`  
**Context:** Faza 1 — arhitectură; fără scaffold `mobile/` în acest ADR

## 1. Context

Aplicația trebuie să vorbească pe Wi‑Fi local cu un server embedded care:

- răspunde fiabil la HTTP/1.0 peste TCP (HTTP/1.1 Node a eșuat pe dispozitivul testat);
- nu gestionează bine operațiile concurente → un singur transfer activ;
- livrează MP4 mari + sidecar NMEA;
- nu are suport `Range` confirmat;
- pe firmware-ul testat nu publică live-view RTSP.

Cerințe de produs: coadă persistentă, player local, hartă opțională, Demo Mode, iOS + Android, local-first, fără Expo Managed dacă limitează socketurile/background/native media.

Codul existent este TypeScript (`src/protocol`, transport, NMEA).

## 2. Opțiuni evaluate

### A. React Native — bare workflow

| Criteriu | Evaluare |
|---|---|
| Reutilizare TypeScript | ridicată pentru protocol/parser/NMEA (pachet comun); transport Node → adaptoare native |
| HTTP/1.0 / TCP raw | posibil prin module native (iOS/Android) sau librării bare; Expo Managed exclus |
| Download lung + un transfer | WorkManager/FGS pe Android; URLSession/background pe iOS cu limite documentate |
| Player MP4 | `react-native-video` / AVPlayer / ExoPlayer via native |
| Audio ADPCM | nativ incert; FFmpeg doar după review licențe (vezi license-plan) |
| Hărți | MapLibre RN + furnizor tile comercial |
| Cost echipă | cel mai mic față de stiva TS existentă |
| Store / native escape hatches | bare = control pe Info.plist, cleartext, FGS, NEHotspotConfiguration |

**Dezavantaje:** bridge JS; nevoie de disciplină pe module native; calitatea librăriilor variază.

### B. Flutter

| Criteriu | Evaluare |
|---|---|
| Reutilizare TypeScript | scăzută — protocolul se rescrie în Dart (sau FFI către C/Rust) |
| HTTP/1.0 / TCP | `dart:io` Socket / HttpClient configurabil; bun control |
| Download / background | isolate + plugin-uri; FGS Android similar |
| Player / audio | `video_player` + platform; ADPCM tot problematice |
| Hărți | MapLibre Flutter sau echivalent |
| Cost echipă | rescriere protocol + UI; UI excelent, dar zero reuse TS |

**Dezavantaje:** dublă mentenanță față de CLI TS; echipă trebuie să mențină Dart + eventual native.

### C. Kotlin Multiplatform + SwiftUI + Jetpack Compose

| Criteriu | Evaluare |
|---|---|
| Reutilizare TypeScript | niciuna — rescriere Kotlin pentru logică comună |
| HTTP/1.0 / TCP | Ktor/raw sockets pe expect/actual; control maxim |
| Download / background | API-uri platformă native (cel mai curat) |
| Player / UI | SwiftUI + Compose — UX nativ excelent |
| Cost echipă | maxim: două UI + shared Kotlin + pierdere stivă TS |

**Dezavantaje:** timp până la MVP; nu valorifică investiția TypeScript actuală.

## 3. Decizie propusă

**Recomandare: React Native bare workflow.**

Motive:

1. Păstrează TypeScript pentru `protocol_common` / parsers (port din `src/protocol/parser.ts`, `nmea.ts`).
2. Permite adaptoare native pentru TCP HTTP/1.0, download `.part`, FGS Android și limitările iOS fără constrângerile Expo Managed.
3. Echilibru cost/risc pentru un produs local-first cu un singur transfer și coadă persistentă.
4. Flutter și KMP rămân alternative dacă prototipul RN eșuează pe HTTP/1.0 background sau pe audio.

**Expo Managed:** exclus pentru MVP dacă limitează socket TCP, cleartext local fin, background transfer sau module media.

## 4. Consecințe

- Monorepo: `mobile/` cu app RN bare + pachet TS `packages/protocol` (sau echivalent).
- Transportul Node (`node:net`, `node:fs`) **nu** se importează; se portează contractul și pattern-urile.
- `cameraMutate` / `probe` nu intră în tree.
- Înainte de Faza 2: titularul semnează acceptarea acestui ADR sau alege B/C în scris.
- Prototype gate (început Faza 2): HTTP/1.0 GET fișier mic pe iOS + Android fizic; un transfer + persist queue; cleartext local; Demo Mode stub.

## 5. Alternative respinse pentru MVP

| Opțiune | Motiv |
|---|---|
| Expo Managed | risc pe TCP/background/native config |
| Flutter ca default | cost rescriere fără beneficiu clar pe protocol |
| KMP ca default | cost maxim; UI dublu fără reuse TS |

## 6. Referințe

- [phase0-audit.md](phase0-audit.md)
- [architecture.md](architecture.md)
- [license-plan.md](license-plan.md)
- [../protocol.md](../protocol.md)
- [../compatibility.md](../compatibility.md)
