# Note de cercetare

## Artefact Android

- pachet: `com.mitac.mitubepro`;
- versiune: `1.1.220.1`;
- XAPK SHA-256: `9FF5C3C429BB0C132C09ED261AFD5D3BAF26733AB23478B40AF45167762F5553`;
- analizat static, fără instalare sau execuție;
- include OkHttp, VLC, IJKPlayer și KSYPlayer;
- conține ramuri CGI/HTTP și un subsistem BLE proprietar pentru alte familii de camere.

## USB și card

Camera apare în Windows ca USB Mass Storage, bus description `MMP SDK`, VID `114D`, PID `8200`. Cardul FAT32 a expus directoarele `Normal`, `Event`, `Parking`, `Photo`, fiecare cu `F` și `R`.

Pe dispozitivul testat au fost observate 79 clipuri normale și 126 parking, fiecare cu sidecar `.NMEA`.

## Wi-Fi

- SSID observat: `MiVue_db:8c`;
- WPA2-Personal / CCMP, 2.4 GHz, 802.11n;
- camera a oferit IP `192.72.1.100` clientului și gateway `192.72.1.1`;
- Wi-Fi-ul camerei este intermitent și uneori trebuie reactivat din meniu.

## Validare CLI live

După reactivarea Wi-Fi-ului, executabilul compilat a validat cu succes pe dispozitivul real:

- `discover`: cameră detectată la `192.72.1.1`, latență observată 43 ms;
- `info`: status `0 OK`, `broadcast=broadcasting`, server AIT `1.6.19`;
- `list --count 5`: cinci intrări MP4 parsate cu categorie, cameră, timestamp, durată și dimensiune.
- `list --all --count 32 --summary`: 209 fișiere în 9 pagini — 83 `Normal`, 126 `Parking`, 0 `Event`, 0 `Photo`; offseturile consecutive și rădăcinile XML specifice categoriei au fost confirmate live.
- `download /SD/Parking/F/PARK260716-033609F.MP4`: 2.586.453 bytes transferați în aproximativ 1,2 secunde, fără fișier `.part` rămas; antet MP4 `ftypqt` și SHA-256 `CAF31EB2D0D8C35FE99BF8550C70CD957A6B53FDCB775F84BCAEEF0B70624842`.
- pista audio este `adpcm_ima_wav`, stereo, 32 kHz, 256 kb/s, cu nivel mediu măsurat de −20,6 dB; a fost validată o copie cu video H.264 neschimbat și audio AAC;
- sidecar-ul NMEA asociat are 3.730 bytes și șapte eșantioane GPS valide pentru clipul de aproximativ 6,76 secunde; exportul GPX a fost validat fără publicarea coordonatelor în log;
- RTSP: `OPTIONS` răspunde pe portul 554, dar `DESCRIBE` primește 404 pe toate rutele cunoscute din APK; capabilitatea firmware este `LiveView=NO`.

Toate cererile de validare (descoperire / list / download) au fost HTTP GET read-only.

## Probe mutate (delete / set)

Tooling: `npm run dev -- probe …`

| Acțiune | Status pe MiVue 866 | Note |
|---|---|---|
| `action=get` status / UIMode | **confirmat** | UIMode citește `UNKNOWN` când e în recording |
| `action=set` UIMode=`PLAYBACK` | **confirmat** `0 OK` | |
| `action=set` UIMode=`MENU` / `UNKNOWN` | **701 Illegal Parameter** | |
| `action=set` SendStopLiveView | **703** Unknown CGI-PARAM | Nu există pe 866 |
| `action=del` | **confirmat live** | `0 OK`; HEAD post-del → 404. Ex.: `/SD/Parking/F/PARK260718-003630F.MP4` |
| Format SD | **exclus temporar** | |

Formă CGI confirmată:

```text
GET /cgi-bin/Config.cgi?action=del&property=/SD/Parking/F/<nume>.MP4
```

Path-ul trebuie să corespundă categoriei reale (`FILE…` → `/SD/Normal/…`, `PARK…` → `/SD/Parking/…`).

Nu stocăm parola rețelei în repository, documentație sau loguri.
