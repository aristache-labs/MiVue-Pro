# Faza 3 — UI produs (Expo Go)

**Data:** 20 iulie 2026  
**Produs:** Laneory  
**Device:** iPhone 14 + Expo Go + EAS Update (`preview`)

## Scope livrat

- Library: filtre categorie (All / Normal / Event / Parking / Photo), sortare (Newest / Oldest / Name), empty states, placeholder pe categorie (nu thumbs cameră)
- Demo fixtures: ~14 intrări pe ≥3 zile; download Demo plafonat la 256 KiB (memorie Expo Go)
- Tab **Local**: scan `documentDirectory/downloads`, Play/View, Share, Delete
- Player modal: `expo-video` (MP4) + Image (JPG)
- Queue: progres, Cancel / Dismiss, Open / Share
- About: disclaimer + notă Expo Go vs native Http10Tcp

## Phase 3.5 — parity vizuală cu web + GPS

- Design tokens aliniate la [`web/styles.css`](../../web/styles.css): teal `#14b8a6` / navy `#0b1220`, radius 8–10
- Fonturi **Source Sans 3** + **IBM Plex Mono** (`@expo-google-fonts`)
- Library: chips TOTAL / NORMAL / PARKING / EVENT / PHOTO, grupare pe dată, CTA **Descarcă**
- Sidecar `.NMEA` enqueue soft după download MP4; Demo Mode servește traseu sintetic pentru `DEMO260720-100000F`
- Player: panou telemetrie + traseu schematic SVG (local); hartă online **doar după opt-in** (WebView + Leaflet; tile-urile publice nu sunt infra garantată)

## În afara Fazei 3

- Thumbnails de pe cameră
- EAS development build iOS (Apple Developer expirat)
- Background download garantat
- Tile OSM ca dependență de produs

## Livrare

```powershell
npx eas-cli update --branch preview --message "Phase 3.5 web UI parity + GPS"
```

Deschide update-ul în Expo Go (Wi‑Fi cu internet), apoi testează Demo Mode; pentru live, treci pe Wi‑Fi cameră după load.
