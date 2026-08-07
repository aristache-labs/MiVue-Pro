# Laneory — mobile (Expo SDK 54)

**Subtitle:** For Mio MiVue 866  
**Short description:** Independent local dashcam library for compatible Mio MiVue cameras.

Aplicație independentă pentru interoperabilitate locală cu camere testate (vezi `../docs/compatibility.md`). Operațiile mutative confirmate trec prin validare centralizată, verificare post-execuție și audit. Nu este afiliată Mio/MiTAC.

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

## Funcționalități și îmbunătățiri

### Design și experiență

- Design system centralizat: paleta originală Laneory, typography, spacing, elevation și motion tokens.
- Temă light/dark persistentă, cu dark mode optimizat pentru OLED și toggle compact în Settings.
- Haptic feedback pentru selecție, long press, refresh și schimbarea categoriilor.
- Micro-animații de apăsare pentru cardurile Library și Local.
- Date/time pickers adaptate explicit temei pentru vizibilitate corectă pe iOS.
- Accessibility îmbunătățită pentru carduri și modul multi-select.

### Library și performanță

- `FlashList` pentru listele mari de fișiere.
- Memoization cu `React.memo`, `useMemo` și `useCallback` în componentele și hook-urile complexe.
- Preview video/photo în Library și Local.
- Multi-select prin long press pe întreaga suprafață a cardului, inclusiv thumbnail și body.
- Download, playback, share și management local al fișierelor.

### Player și GPS

- Player `expo-video` cu controalele native pentru play/pause, seek, playback speed și Picture-in-Picture unde platforma permite.
- Hartă online Leaflet/OpenStreetMap și hartă schematică locală offline.
- Playback sincronizat cu traseul GPS.
- Telemetrie unificată într-un singur panel cu Speed, Altitude, Camera Time, Distance, Average Speed și Max Speed.
- Export GPX pentru traseele disponibile.

### Settings și storage

- Breakdown pentru biblioteca locală și fișierele listate de pe cardul SD, grupate pe Normal, Parking, Events și Photos.
- Ștergerea validată a bibliotecii locale și curățarea cache-ului de thumbnails.
- Formatarea cardului SD disponibilă numai prin fluxul centralizat de mutații, cu verificare de capabilitate și confirmare întărită.

## Verificări automate (fără cameră)

```powershell
Set-Location mobile
npm test
npm run typecheck
```

Unele verificări complete pot raporta erori baseline cunoscute în fișiere legacy. Înainte de un EAS Update, verifică întotdeauna că fișierele modificate nu introduc erori noi.

## EAS Update preview

Pentru modificări OTA-compatible validate din `mobile/`:

```powershell
Set-Location mobile
npx eas-cli update --branch preview --message "Descriere modificare"
```

Nu publica pe `development` sau `production` fără o cerere explicită. Modificările native, plugin-urile Expo, permisiunile și dependențele native necesită un EAS Build compatibil, nu doar un update OTA.

## Online map (Leaflet + OpenStreetMap)

Player **Online map** uses Leaflet in a WebView with public OSM raster tiles (`tile.openstreetmap.org`), opt-in only. Suitable for current/dev use — not a guaranteed commercial product dependency.

**Local schematic** stays fully offline (no tile / network requests).

No Google Maps SDK keys are required.

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
```
