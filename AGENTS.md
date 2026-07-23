# AGENTS.md — reguli pentru agenți în MiVue Pro / `Laneory`

Acest repository conține un CLI TypeScript + dashboard local pentru interoperabilitate cu camere auto deținute legal, plus o aplicație mobilă comercială independentă (nu oficială Mio/MiTAC). Comunicarea cu camera este read-only în mod implicit; produsul poate expune un set limitat de operații mutative inițiate explicit de utilizator.

## Obligatoriu

- Rămâi **read-only în mod implicit** față de cameră (GET/HEAD), în special în refresh, polling, bootstrap, download și toate fluxurile automate.
- În produsul mobil sunt permise numai aceste mutații, declanșate explicit în foreground de utilizator: setarea allowlisted pentru Frequency, EV, Date & Time, Time Zone și Daylight Saving Time; ștergerea fișierelor selectate de pe cardul camerei; formatarea cardului SD.
- Nu executa mutații în background, la reconectare, la refresh sau prin retry automat. Marchează requesturile mutative cu politica `mutation`/fără retry și revalidează conexiunea, modelul/capabilitatea și ținta imediat înainte de execuție.
- Pentru `set`, afișează valoarea curentă și valoarea propusă și cere confirmare explicită. Pentru ștergere, afișează numărul și țintele validate; operațiile bulk cer confirmare întărită. Pentru format SD, folosește confirmare în doi pași cu text introdus de utilizator și avertisment clar că operația este ireversibilă.
- Nu implementa alte proprietăți `set`, ștergere automată, update/upload de firmware sau ocolirea autentificării. Nu prezenta succesul până când răspunsul camerei nu este validat și informația nu este reîmprospătată.
- Nu accesa, analiza, copia, importa sau distribui: `MiVue+Pro_*.xapk`, APK/XAPK oficiale, `.analysis/`, decompilări, resurse/iconuri/texte Mio/MiTAC, chei/certificate din aplicația oficială, firmware.
- Nu clona UI-ul aplicației MiVue Pro.
- Nu porni aplicația cu `npm start` / `npx expo start` — utilizatorul rulează CLI-ul.
- Folosește comenzi **Windows** (PowerShell).
- Nu publica și nu trimite build-uri către Apple/Google fără aprobare explicită a utilizatorului.
- Nu declara aplicația „aprobată legal”; documentele din `docs/legal/` sunt materiale pregătitoare.

## Excluderi (deja în `.gitignore`; replică în `mobile/` la scaffolding)

- `.analysis/`, `.agents/`, `.cursor/` (local tooling)
- `androguard.db`, `MiVue+Pro_*.xapk`
- `downloads/`, `node_modules/`, `dist/`, `.env`

## Surse permise pentru protocol

- Cod original din `src/`, inclusiv allowlistul și validările auditate din `cameraMutate.ts`; codul generic de `probe` rămâne tooling de dezvoltare și nu se importă în produsul mobil
- [docs/protocol.md](docs/protocol.md) — observații confirmate; secțiunea APK este în **carantină**
- [docs/compatibility.md](docs/compatibility.md)
- [docs/legal/](docs/legal/) și [docs/mobile/](docs/mobile/)
- Răspunsuri read-only de la o cameră deținută legal
- Documentație oficială Apple, Google, UE și a bibliotecilor folosite

## Pointere utile

| Domeniu | Fișier |
|---|---|
| Protocol observat | `docs/protocol.md` |
| Compatibilitate modele/firmware | `docs/compatibility.md` |
| Securitate CLI/dashboard | `docs/security-and-legal.md` |
| Audit Faza 0 | `docs/mobile/phase0-audit.md` |
| ADR framework | `docs/mobile/adr-001-framework.md` (Expo prebuild acceptat) |
| Arhitectură mobilă | `docs/mobile/architecture.md` |
| App mobilă | `mobile/` — nu rula `expo start` / `npm start` pentru utilizator |
| Gate release juridic | `docs/legal/release-legal-checklist.md` |

## Brand

Nume produs mobil: **Laneory** (subtitle/store drafts în `docs/mobile/store-listing.md`). Trademark clearance încă obligatorie înainte de submit. „Mio”/„MiVue” doar factual. Vezi `docs/legal/trademark-usage.md`.
