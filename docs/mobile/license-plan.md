# Plan de licențe — aplicație mobilă

**Statut:** Faza 1 — plan; inventarul final se completează în [../legal/third-party-licenses.md](../legal/third-party-licenses.md)  
**ADR:** [adr-001-framework.md](adr-001-framework.md)  
**Data:** 20 iulie 2026

> Material pregătitor — nu este consultanță juridică. Compatibilitatea licențelor pentru distribuție comercială trebuie confirmată de avocat înainte de release.

## 1. Obiective

- SBOM complet la fiecare release.
- Notice-uri afișate în About / Third-Party Notices.
- Fără copyleft neintenționat în binarul magazinelor.
- Fără FFmpeg în MVP până la review dedicat.
- Hărți: motor + date/tile cu termeni comerciali clari (nu OSM public tiles ca infra).

## 2. Stack propus (post ADR-001)

| Strat | Candidat | Acțiune licență |
|---|---|---|
| Framework | Expo SDK + React Native (prebuild/dev builds) | inventariază Expo + RN + Metro + Hermes + dependențe transitive la lock; nu Expo Go ca runtime producție |
| UI | Expo Router + React Native | preferă MIT/Apache-2.0/BSD; evit GPL în app store binary fără review |
| Protocol/parsers | cod propriu portat din TS | confirmă lanțul de titlu; fără fragment APK |
| Networking nativ | module proprii / librării TCP | inventar per platformă |
| Storage / DB | ex. SQLite via librărie permisivă | notice + versiune exactă |
| Player video | AVPlayer / ExoPlayer (API platformă) + wrapper | preferat față de FFmpeg |
| Audio ADPCM | evaluare nativă întâi | dacă eșuează → ADR FFmpeg separat |
| Hărți | MapLibre Native + **furnizor tile comercial** | software MapLibre + contract tile + atribuire OSM |
| Demo media | active sintetice proprii | fără clipuri reale cu terți identificabili |

## 3. FFmpeg — poartă separată (implicit închisă)

Înainte de orice includere:

1. Configurație exactă (flags, codecuri activate/dezactivate).
2. LGPL vs GPL a build-ului rezultat.
3. Obligații source / relinking / NOTICE.
4. Brevete/codec royalty pe teritoriile de distribuție.
5. Compatibilitate politici Apple/Google.
6. Intrare în `third-party-licenses.md` + SBOM + About screen.

Fără aceste dovezi: **nu se livrează FFmpeg**.

## 4. Hărți — poartă

| Opțiune | Notă |
|---|---|
| Furnizor comercial pe date OSM | preferat pentru SLA/volum |
| Infrastructură proprie de tile | cost ops; tot cu atribuire OSM |
| MapLibre + stil propriu offline | minimizează transferuri |

**Interzis ca dependență de producție garantată:** `tile.openstreetmap.org` public.

Atribuire permanentă în UI: OpenStreetMap + furnizor.

## 5. Proces pe release

1. Generare SBOM din lockfiles + native deps.
2. Scan SCA + triere umană.
3. Actualizare `docs/legal/third-party-licenses.md`.
4. Regenerare ecran Third-Party Notices.
5. Checkbox în [../legal/release-legal-checklist.md](../legal/release-legal-checklist.md).

## 6. Gate Faza 2

- Lista dependențelor de bootstrap RN aprobată intern.
- Nicio dependență GPL/AGPL în app fără excepție semnată.
- Decizie scrisă: FFmpeg da/nu pentru MVP (default **nu**).
