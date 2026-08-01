# Registru de compatibilitate

**Produs:** `Laneory`  
**Statut:** registru pregătitor; nu este certificare a producătorului  
**Ultima actualizare:** 27 iulie 2026

Nu se declară compatibilitate cu modele sau firmware netestate. Fiecare rând necesită teste datate pe un dispozitiv deținut legal; operațiile `read` și mutative se documentează separat, împreună cu nivelul lor de validare.

## Modele declarate

| Model | Firmware cameră | Proxy tehnic observat | Funcții testate (`read` / mutații) | Nivel | Data test | Note |
|---|---|---|---|---|---|---|
| Mio MiVue 866 | `VI100.24.50.BE1WD.10` (`Vendor.DeviceInfo.Version.Firmware`) | Server HTTP `AIT Multimedia Network Solution, UPnP/1.0 devices/1.6.19` | `read`: discovery/status, listare Normal/Event/Parking/Photo, download MP4/NMEA, checksum NMEA → GPX, software identity (Firmware / SpeedCam / Voice / AP SSID); probe mutative CLI: `set` UIMode, `del` pe `/SD/`, **format SD** `SET SD0=format` (pre 2 fișiere → post 0; SD0 rămâne READY; timeout client ≥180–300 s) | `read`: `camera-confirmed`; format SD: `production-validated` pe 866; alte mutații probe: `camera-confirmed`, nu toate `production-validated` | 2026-07 (CLI/dashboard + mobile Settings) | Live-view RTSP indisponibil (`LiveView=NO`). Suport HTTP `Range` neconfirmat. SafetyCam=`Vendor.DeviceInfo.Version.SpeedCam`; Voice=`Vendor.DeviceInfo.Version.Voice`; SSID=`Net.WIFI_AP.SSID`. Format la timeout 5 s → `ETIMEDOUT` / `unknown` (fără retry); card plin poate bloca CGI mai mult. |

Header-ul `Server` AIT **nu înlocuiește** versiunea de firmware a camerei. Firmware-ul Dashcam info vine din `Vendor.DeviceInfo.Version.Firmware` (GET only).

Preview media (2026-08-01): pe MiVue 866, fotografia remote prin GET și flagul `Vendor.DeviceInfo.SupportPlaybackPreview=YES` sunt `camera-confirmed`. Playerul video direct Laneory este disponibil numai în channel-ul intern `preview` și rămâne `implementation-preview` până la validarea fizică iOS + Android; suportul HTTP `Range`/seek rămâne neconfirmat.

## Funcții în afara afirmațiilor de compatibilitate store (până la validare completă)

- orice `set`/`del` neconfirmat pe modelul și firmware-ul conectat;
- ștergerea și modificarea setărilor din aplicația mobilă, până la finalizarea validării production și a verificării post-execuție;
- format SD pe **alte** modele/firmware decât 866 / `VI100.24.50.BE1WD.10`; pe 866 SET `SD0=format` e `production-validated`;
- update firmware;
- live-view / RTSP;
- alte modele Mio/MiVue sau familii BLE;
- resume HTTP pe baza `Range` (neconfirmat).
- promovarea preview-ului video remote în production înainte de testarea fizică iOS + Android, inclusiv clip mare, seek și reconnect/fallback.

## Surse

- Observații black-box și CLI: [docs/protocol.md](protocol.md), [docs/research-notes.md](research-notes.md). Concluziile exclusiv APK rămân `apk-observed` și în carantină până la validarea pe cameră; probele confirmate se documentează separat.
- Gate juridic: [docs/legal/trademark-usage.md](legal/trademark-usage.md), [docs/legal/ip-review.md](legal/ip-review.md).

## Cum se adaugă un rând

1. Test pe cameră deținută/controlată de utilizator: operații `read` și, dacă este cazul, mutații cu confirmare, validare pre-execuție și verificare post-execuție.
2. Notează modelul, firmware-ul citit de pe dispozitiv, data, IP/port observate (fără parole).
3. Listează separat funcțiile `read`, mutațiile confirmate, nivelul de validare și eșecurile (ex. RTSP 404).
4. Review intern +, înainte de store, confirmare că afirmația e aprobată juridic.
