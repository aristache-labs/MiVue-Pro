# Faza 3 — UI produs (Expo Go)

**Data:** 20 iulie 2026  
**Produs:** Laneory  
**Device:** iPhone 14 + Expo Go + EAS Update (`preview`)

## Scope livrat

- Library: filtre categorie (All / Normal / Event / Parking / Photo), sortare (Newest / Oldest / Name), empty states, placeholder pe categorie (nu thumbs cameră)
- Demo fixtures: ~14 intrări pe ≥3 zile; download Demo plafonat la 256 KiB (memorie Expo Go)
- Tab **Local**: scan `documentDirectory/downloads`, Play/View, Share
- Player modal: `expo-video` (MP4) + Image (JPG)
- Queue: Open in Local / Play + Share
- About: disclaimer + notă Expo Go vs native Http10Tcp

## În afara Fazei 3

- Hartă / tiles
- Thumbnails de pe cameră
- EAS development build iOS (Apple Developer expirat)
- Background download garantat

## Livrare

```powershell
cd mobile
npx eas-cli update --branch preview --message "Phase 3 UI"
```

Deschide update-ul în Expo Go (Wi‑Fi cu internet), apoi testează Demo Mode; pentru live, treci pe Wi‑Fi cameră după load.
