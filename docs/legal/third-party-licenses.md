> **MATERIAL PREGĂTITOR — NU CONSTITUIE CONSULTANȚĂ JURIDICĂ. Necesită revizuire de avocat RO/UE specializat în software și proprietate intelectuală înainte de orice folosire comercială.**

# Inventar licențe terțe

**Versiune:** 0.1  
**Data:** 19 iulie 2026  
**Scop:** schelet pentru Software Bill of Materials și notice-urile aplicației mobile

## 1. Reguli

- se înregistrează versiunea exactă rezolvată, nu doar intervalul din manifest;
- se verifică licența din artefactul efectiv livrat și fiecare dependență tranzitivă;
- se păstrează textele de copyright, license și NOTICE cerute;
- se separă dependențele de build/test de cele incluse în binar;
- se documentează activele: fonturi, icoane, tile-uri, date cartografice, fișiere demo și codecuri;
- „open source” nu înseamnă automat compatibil cu modelul de distribuție;
- scanarea automată este urmată de review uman și juridic înainte de release.

## 2. Dependență confirmată în proiectul curent

| Componentă | Versiune rezolvată | Rol curent | Licență | Titular/notice | Stare pentru mobil |
|---|---:|---|---|---|---|
| Leaflet | 1.9.4 | hartă în dashboardul web | BSD-2-Clause | Copyright © 2010–2023 Volodymyr Agafonkin; © 2010–2011 CloudMade | referință numai; nu este încă selectat pentru mobil |

Fișierul `node_modules/leaflet/LICENSE` verificat local cere păstrarea notificării de copyright, a condițiilor și a disclaimer-ului pentru redistribuire în sursă sau binar. La distribuție, textul integral trebuie inclus în mecanismul de acknowledgements/third-party notices adecvat platformei.

Harta web curentă afișează atribuirea OpenStreetMap. **Datele și tile-urile OpenStreetMap au termeni/atribuiri distincte de licența Leaflet**; alegerea unui furnizor de tile-uri pentru mobil necesită contract, attribution și privacy review separat.

## 3. Framework mobil — de completat în Faza 1/2

| Candidat | Versiune | Licență proiect | Runtime livrat | Dependențe native/transitive | Decizie |
|---|---|---|---:|---|---|
| React Native bare | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| Flutter | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| Kotlin Multiplatform | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |

Completarea tabelului nu constituie singură aprobarea framework-ului; ADR-ul Fazei 1 trebuie să lege alegerea de obligațiile de distribuție iOS/Android.

## 4. Hărți — de completat

| Componentă/serviciu | Versiune/plan | Licență software | Termeni date/tile | Atribuire UI | Transferuri de date | Decizie |
|---|---|---|---|---|---|---|
| MapLibre Native | `[TBD]` | `[TBD]` | n/a pentru motor; depinde de sursa datelor | `[TBD]` | `[TBD]` | `[TBD]` |
| furnizor tile-uri online | `[TBD]` | n/a | `[TBD]` | `[TBD]` | IP, user-agent și coordonate tile/viewport pot ajunge la furnizor | `[TBD]` |
| hartă offline | `[TBD]` | `[TBD]` | licență bază de date/tiles `[TBD]` | `[TBD]` | local | `[TBD]` |

Nu se presupune că serverele publice de tile-uri OpenStreetMap pot susține traficul aplicației comerciale. Termenii furnizorului ales trebuie aprobați înainte de integrare.

## 5. Media și codecuri — de completat

| Componentă | Build/version | Licență și opțiuni de compilare | Codecuri incluse | Risc brevete/royalty | Distribuție store | Decizie |
|---|---|---|---|---|---|---|
| FFmpeg | `[TBD]` | `[LGPL/GPL/TBD]` | `[TBD]` | `[TBD — analiză pe țări]` | `[TBD]` | `[TBD]` |
| player nativ iOS | `[TBD]` | platformă | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| player nativ Android | `[TBD]` | platformă | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |

Licența FFmpeg depinde de configurația concretă a build-ului. O listă generică de licențe nu este suficientă; trebuie arhivate flags, surse, patch-uri, object files/relinking obligations unde se aplică și analiza separată a brevetelor/codecurilor.

## 6. Alte categorii obligatorii

| Categorie | Componentă | Versiune/sursă | Licență | Notice/atribuire | Aprobat |
|---|---|---|---|---|---|
| networking | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| XML/NMEA/GPX | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| storage/filesystem | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| background jobs | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| crash reporting/analytics | implicit `niciunul` până la decizie | — | — | — | `[TBD]` |
| fonts/icons | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| demo media | sintetic/propriu `[TBD]` | `[TBD]` | `[TBD]` | release-uri de imagine/sunet `[TBD]` | `[TBD]` |

## 7. Evidențe de păstrat la fiecare release

- lockfiles și SBOM cu hash;
- sursa și textul licenței fiecărui artefact;
- lista componentelor efectiv incluse în binar;
- notice-ul afișat în aplicație și pachetul de distribuție;
- rezultate scanare SCA și trierea manuală;
- aprobări juridice pentru copyleft, codecuri, hărți, fonturi și active demo;
- dovada ofertelor de source/relinking dacă o licență le cere;
- revizuirea termenilor serviciilor online la data release-ului.

## 8. Gate

Nu se aprobă release-ul cât timp există câmpuri `[TBD]` pentru componente livrate, licențe incompatibile/neclare, notice-uri lipsă sau analiză nerezolvată pentru codecuri și date cartografice.
