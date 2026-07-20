# Faza 2b — note prototype (Fetch / native)

**Data:** 20 iulie 2026  
**Produs:** Laneory  
**Device de test:** iPhone 14 (fizic). **Fără Android** în această fază.

## Scop

Consemnează rezultatele probei live pe Wi‑Fi cameră. Nu include parole, SSID complete, GPS sau nume reale de fișiere personale.

## Medii

| Mediu | Transport | Status |
|---|---|---|
| Expo Go (SDK 54) + EAS Update | `FetchTransport` | **probat OK** (listă + download mic/mediu) |
| Development build iOS (EAS) | `NativeTcpTransport` / `Http10Tcp` | **următorul gate** — necesar Apple Developer |

## Rezultate Expo Go (iPhone 14)

| Dată | Host | Transport | Status | List | Download | Note |
|---|---|---|---|---|---|---|
| 20 iul 2026 | `192.72.1.1` | Fetch | OK | OK | OK (~149 KiB real) | Via EAS Update; timeout inițial `Aborted` (5s) |
| 20 iul 2026 | `192.72.1.1` | Fetch | — | — | fail→fix | List size ≠ HEAD; coada folosește HEAD |

## Observații rețea (Windows + iPhone)

- Cale care a mers: **EAS Update** + iPhone pe Wi‑Fi cameră.
- Metro pe LAN eșuează des (izolare router / AP cameră).
- Hotspot PC nu face bridge către AP-ul camerei.

## Gate native iOS

**BLOCAT (20 iul 2026):** cont Apple Developer **expirat**; reînnoire amânată. Fără el nu se poate instala development client / Http10Tcp pe iPhone 14 fizic.

Când contul e din nou activ:

```powershell
cd mobile
npx eas-cli device:create
npx eas-cli build -p ios --profile development
npx eas-cli update --branch development --message "Native Http10Tcp client"
```

| Dată | Host | Transport | Status | List | Download | Note |
|---|---|---|---|---|---|---|
| — | `192.72.1.1` | Native HTTP/1.0 | blocked | — | — | așteaptă Apple Developer |

## Concluzie / cale înainte

- Fetch pe Expo Go: **acceptat ca probe 2b** (list + download + share).
- Native Http10Tcp: **amânat** până la Apple Developer.
- Continuare recomandată: **Faza 3 UI** pe Expo Go (Demo Mode + Fetch live unde merge), fără EAS iOS build.
