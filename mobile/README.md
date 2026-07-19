# `[NUMELE_APLICAȚIEI]` — mobile (Expo)

Aplicație independentă, read-only, pentru interoperabilitate locală cu camere testate (vezi `../docs/compatibility.md`). Nu este afiliată Mio/MiTAC.

**Stack:** Expo SDK **54** + React Native (compatibil cu Expo Go din App Store).  
**Producție / cameră reală:** development builds / prebuild (nu Expo Go).  
**ADR:** `../docs/mobile/adr-001-framework.md`

## Ce rulează agentul vs tu

Agentul **nu** pornește Metro (`expo start` / `npm start`). Rulezi tu:

```powershell
cd mobile
npm install
npx expo start
```

Development build (când ai nevoie de TCP HTTP/1.0 / cleartext nativ):

```powershell
npx expo prebuild
npx expo run:android
# sau: npx expo run:ios
```

## Teste fundație (fără cameră)

```powershell
cd mobile
npm test
```

## Structură

```text
app/                 Expo Router UI
packages/
  parsers/           Config.cgi + XML + NMEA/GPX
  protocol/          client read-only (fără set/del)
  camera-transport/  Transport contract + Demo + Fetch stub
  local-db/          persist coadă
  download-queue/    un transfer activ
  demo/              fixtures sintetice
```

## Prototype gate (device fizic)

1. Development build pe telefon conectat la Wi‑Fi-ul camerei.
2. GET status HTTP/1.0 către IP-ul camerei.
3. Dacă `fetch` eșuează pe HTTP/1.0 → implementați `NativeTcpTransport`.
