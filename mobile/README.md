# Laneory — mobile (Expo SDK 54)

**Subtitle:** For Mio MiVue 866  
**Short description:** Independent local dashcam library for compatible Mio MiVue cameras.

Aplicație independentă, read-only, pentru interoperabilitate locală cu camere testate (vezi `../docs/compatibility.md`). Nu este afiliată Mio/MiTAC.

**ADR:** `../docs/mobile/adr-001-framework.md`  
**Prototype notes:** `../docs/mobile/phase2b-prototype-notes.md`

## Expo Go (calea default pe Windows)

Fără Apple Developer / EAS: folosește **doar Expo Go**.

```powershell
cd mobile
npm install
npm start
```

(`npm start` = `expo start --go`. Nu folosi `--dev-client`.)

1. Pe iPhone: aplicația **Expo Go** (App Store), SDK 54.
2. Același Wi‑Fi ca PC-ul (sau tunnel dacă CLI o cere).
3. Scanează QR din terminal → se deschide în Expo Go.

În app:
- **Library** — filtre categorie + sortare; Demo ON = fixtures; Demo OFF = Fetch live.
- **Local** — fișiere descărcate; Play/View + Share.
- **Queue** — transferuri; Open/Play + Share to Files.
- Native Http10Tcp amânat (Apple Developer).

Agentul **nu** pornește Metro.

## Expo Go via expo.dev (fără Metro pe LAN)

Când iPhone-ul nu poate ajunge la PC (izolare Wi‑Fi / Ethernet), publică JS pe EAS Update și încarcă din cloud.

```powershell
cd mobile
npm install
npx eas-cli login
npx eas-cli update --branch preview --message "Laneory preview"
```

Rulează **doar din `mobile/`**. Nu din rădăcina repo-ului.

1. iPhone pe Wi‑Fi **cu internet** → scanează QR-ul din terminal (sau deschide update-ul din [expo.dev](https://expo.dev) în Expo Go).
2. După ce Laneory e încărcat → treci iPhone pe Wi‑Fi-ul **camerei**.
3. Demo OFF → Camera IP `192.72.1.1` → Connect.

Note: pe Wi‑Fi cameră nu reîncarcă de pe expo.dev (de obicei fără internet). Hot reload nu merge. Fetch HTTP/1.0 poate tot eșua în Expo Go.

## Development build (Http10Tcp nativ) — Windows

Expo Go **nu** include modulul `http10-tcp`. Pentru streaming nativ: **EAS development client**.

### Cerințe

- Cont Expo (deja: `pateutz`)
- **Apple Developer Program** pentru iPhone fizic (obligatoriu la iOS device)
- Din `mobile/`: `expo-dev-client` + plugin `withLocalNetworkCleartext` + `modules/http10-tcp`

### iOS

```powershell
cd mobile
npm install
npm run build:dev:ios
```

După ce build-ul e gata pe [expo.dev](https://expo.dev/accounts/pateutz/projects/mivue-866-cli): instalează pe iPhone (QR / link), apoi:

```powershell
# JS live (același Wi‑Fi ca PC, sau EAS Update pe branch development)
npm run start:dev-client
# sau, fără Metro pe LAN:
npx eas-cli update --branch development --message "Native client JS"
```

Verificare în app: banner **Live — native HTTP/1.0** (nu „Expo Go Fetch probe”).

1. iPhone pe Wi‑Fi cameră.
2. Demo OFF, IP `192.72.1.1`.
3. Connect → listă; Descarcă → streaming `.part` → rename; Share to Files.

### Android

**Amânat** — nu există device de test. Nu rula `build:dev:android` până există hardware.

## Teste automate (fără cameră)

```powershell
cd mobile
npm test
```

## Google Maps (Online map — native only)

Player **Online map** uses **Maps SDK for iOS / Android** via `react-native-maps` (`PROVIDER_GOOGLE`).  
Local schematic never contacts Google.

### Environment (never commit real keys)

Copy `.env.example` → `.env` (gitignored):

```text
GOOGLE_MAPS_IOS_API_KEY=
GOOGLE_MAPS_ANDROID_API_KEY=
```

Also set the same names as **EAS Secrets** for cloud builds. Keys are injected at prebuild via `app.config.ts` into native config only.

### Key restrictions (Google Cloud Console)

**iOS key**

- Application restriction: bundle ID `app.laneory.mobile`
- API restriction: **Maps SDK for iOS** only

**Android key**

- Application restriction: package `app.laneory.mobile` + SHA-1 (debug / Play App Signing)
- API restriction: **Maps SDK for Android** only

Use **separate** keys for development and production. Do **not** enable Places, Routes, Directions, Roads, Street View, Geocoding, Map Tiles, Navigation SDK, or cloud Map IDs.

After changing keys: rebuild the **dev client** (`eas build` / `expo prebuild` + run). Expo Go does not include custom Maps SDK keys the same way.

### Ops

- Set a Google Cloud **budget alert**
- Review Maps SDK pricing periodically
- Monitor usage; disable unused APIs

## Structură

```text
app/                      Expo Router UI
context/                  Demo / live session
modules/http10-tcp/       Native HTTP/1.0 TCP (Swift + Kotlin)
plugins/                  ATS / cleartext local
packages/
  parsers/
  protocol/
  camera-transport/       Demo, Fetch, NativeTcp
  local-db/
  download-queue/
  demo/
eas.json                  development profile
app.config.ts             Expo config + Google Maps env keys
```
