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
- **Demo Mode ON** — fixtures locale, fără cameră.
- **Demo Mode OFF** — IP (default `192.72.1.1`) + probe Fetch. Poate eșua pe HTTP/1.0 strict; atunci rămâi pe Demo până la un development build.

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

## Development build iOS (HTTP/1.0 nativ) — Windows + iPhone

PC-ul e Windows: **nu** folosi `expo run:ios` local. Folosește **EAS**.

### Cerințe

- Cont Expo (`npx expo login`)
- **Apple Developer Program** (pentru instalare pe iPhone fizic)
- `eas-cli`: `npm install -g eas-cli` (sau `npx eas-cli`)

### Pași

```powershell
cd mobile
npm install
npx eas login
npx eas build:configure
npx eas build -p ios --profile development
```

După build: instalează pe iPhone (link Expo / QR), apoi:

```powershell
npx expo start --dev-client --clear
```

1. iPhone pe Wi‑Fi-ul camerei.
2. Demo Mode OFF, IP corect.
3. Connect / refresh — status + listă via modulul `Http10Tcp`.
4. Descarcă — streaming pe disc (`documentDirectory/downloads`, `.part` → rename).

### Android (opțional)

```powershell
npx eas build -p android --profile development
# sau pe mașină cu Android SDK: npx expo run:android
```

## Teste automate (fără cameră)

```powershell
cd mobile
npm test
```

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
