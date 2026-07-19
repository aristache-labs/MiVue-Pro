# Registru de compatibilitate

**Produs:** `Laneory`  
**Statut:** registru pregătitor; nu este certificare a producătorului  
**Ultima actualizare:** 20 iulie 2026

Nu se declară compatibilitate cu modele sau firmware netestate. Fiecare rând necesită test pe dispozitiv deținut legal, datat, read-only.

## Modele declarate

| Model | Firmware cameră | Proxy tehnic observat | Funcții testate (read-only) | Nivel | Data test | Note |
|---|---|---|---|---|---|---|
| Mio MiVue 866 | `[TBD — de citit de pe dispozitiv]` | Server HTTP `AIT Multimedia Network Solution, UPnP/1.0 devices/1.6.19` | discovery/status, listare Normal/Event/Parking/Photo, download MP4/NMEA, checksum NMEA → GPX | testat read-only | 2026-07 (CLI/dashboard) | Live-view RTSP indisponibil pe firmware-ul testat (`LiveView=NO`). Suport HTTP `Range` neconfirmat. |

Header-ul `Server` AIT **nu înlocuiește** versiunea de firmware a camerei. Până la completarea câmpului firmware, afirmațiile de store trebuie să menționeze doar modelul și limita „firmware-ul testat documentat”, fără a inventa un număr de versiune.

## Funcții în afara afirmațiilor de compatibilitate

- ștergere pe cameră, modificare setări, format SD, update firmware;
- live-view / RTSP;
- alte modele Mio/MiVue sau familii BLE;
- resume HTTP pe baza `Range` (neconfirmat).

## Surse

- Observații black-box și CLI: [docs/protocol.md](protocol.md), [docs/research-notes.md](research-notes.md) (secțiunile APK/mutate sunt în carantină).
- Gate juridic: [docs/legal/trademark-usage.md](legal/trademark-usage.md), [docs/legal/ip-review.md](legal/ip-review.md).

## Cum se adaugă un rând

1. Test pe cameră deținută/controlată de utilizator, numai GET/HEAD.
2. Notează modelul, firmware-ul citit de pe dispozitiv, data, IP/port observate (fără parole).
3. Listează funcțiile confirmate și eșecurile (ex. RTSP 404).
4. Review intern +, înainte de store, confirmare că afirmația e aprobată juridic.
