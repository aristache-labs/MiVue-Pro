# Registru de compatibilitate

**Produs:** `Laneory`  
**Statut:** registru pregătitor; nu este certificare a producătorului  
**Ultima actualizare:** 20 iulie 2026

Nu se declară compatibilitate cu modele sau firmware netestate. Fiecare rând necesită test pe dispozitiv deținut legal, datat; operațiile mutative se notează separat de cele read.

## Modele declarate

| Model | Firmware cameră | Proxy tehnic observat | Funcții testate | Nivel | Data test | Note |
|---|---|---|---|---|---|---|
| Mio MiVue 866 | `[nu expus via CGI getInfo confirmat — 2026-07-24]` | Server HTTP `AIT Multimedia Network Solution, UPnP/1.0 devices/1.6.19` | discovery/status, listare Normal/Event/Parking/Photo, download MP4/NMEA, checksum NMEA → GPX; probe CLI: `set` UIMode, `del` pe cale `/SD/` (vezi protocol) | testat (read + probe mutate CLI) | 2026-07 (CLI/dashboard) | Live-view RTSP indisponibil pe firmware-ul testat (`LiveView=NO`). Suport HTTP `Range` neconfirmat. Versiunile Firmware / SafetyCam / Voice din meniul Dashcam info **nu** apar în `status` / `getInfo`. |

Header-ul `Server` AIT **nu înlocuiește** versiunea de firmware a camerei. Până la o proprietate CGI confirmată black-box, Laneory afișează `Not reported by camera` pentru Firmware / Safety camera data / Voice package — fără a inventa un număr de versiune.

## Funcții în afara afirmațiilor de compatibilitate store (până la validare pe model)

- format SD pe toate firmware-urile; update firmware;
- live-view / RTSP;
- alte modele Mio/MiVue sau familii BLE;
- resume HTTP pe baza `Range` (neconfirmat);
- orice `set`/`del` neconfirmat pe modelul/firmware-ul conectat.

## Surse

- Observații black-box și CLI: [docs/protocol.md](protocol.md), [docs/research-notes.md](research-notes.md) (secțiunile APK-derived rămân marcate `apk-observed` până la validare).
- Gate juridic: [docs/legal/trademark-usage.md](legal/trademark-usage.md), [docs/legal/ip-review.md](legal/ip-review.md).

## Cum se adaugă un rând

1. Test pe cameră deținută/controlată de utilizator (read și, dacă e cazul, mutații cu confirmare/dry-run).
2. Notează modelul, firmware-ul citit de pe dispozitiv, data, IP/port observate (fără parole).
3. Listează funcțiile confirmate (cu clasificare read / mutație) și eșecurile (ex. RTSP 404).
4. Review intern +, înainte de store, confirmare că afirmația e aprobată juridic.
