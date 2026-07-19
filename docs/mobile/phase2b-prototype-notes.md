# Faza 2b — note prototype (Fetch / native)

**Data:** 20 iulie 2026  
**Produs:** `Laneory`

## Scop

Consemnează rezultatele probei live pe Wi‑Fi cameră. Nu include parole, SSID complete, GPS sau nume reale de fișiere personale.

## Medii

| Mediu | Transport | Status așteptat |
|---|---|---|
| Expo Go (SDK 54) | `FetchTransport` | poate eșua pe HTTP/1.0 al camerei |
| Development build (EAS) | `NativeTcpTransport` / `Http10Tcp` | ținta pentru status/list/download |

## Pași probe Expo Go

1. iPhone pe Wi‑Fi-ul camerei.
2. Demo Mode OFF, IP `192.72.1.1` (sau IP confirmat).
3. Connect / refresh camera.
4. Notează: status OK / timeout / HTTP error (fără body).

## Rezultat (de completat după test pe device)

| Dată | Device | Host | Transport | Status | List | Note |
|---|---|---|---|---|---|---|
| `[TBD]` | iPhone 14 | `192.72.1.1` | Fetch (Expo Go) | `[TBD]` | `[TBD]` | |
| `[TBD]` | iPhone 14 | `192.72.1.1` | Native HTTP/1.0 | `[TBD]` | `[TBD]` | după EAS build |

## Concluzie provizorie

Până la rânduri completate: Demo Mode rămâne calea stabilă pe Expo Go; live nativ necesită development build.
