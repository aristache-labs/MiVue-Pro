# AGENTS.md — reguli pentru agenți în MiVue Pro / `[NUMELE_APLICAȚIEI]`

Acest repository conține un CLI TypeScript + dashboard local read-only pentru interoperabilitate cu camere auto deținute legal, plus documentația de tranziție către o aplicație mobilă comercială independentă (nu oficială Mio/MiTAC).

## Obligatoriu

- Rămâi **read-only** față de cameră (GET/HEAD) în produsul mobil și în fluxurile automate. Nu implementa `set`, `del`, format SD, update firmware sau ocolirea autentificării.
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

- Cod original din `src/` (cu excepția `cameraMutate.ts` / `probe` pentru mobil)
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

Numele produsului mobil rămâne placeholder `[NUMELE_APLICAȚIEI]` până la trademark clearance. „Mio”/„MiVue” doar factual, pentru compatibilitate testată. Vezi `docs/legal/trademark-usage.md`.
