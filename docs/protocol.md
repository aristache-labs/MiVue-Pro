# Protocol MiVue 866 — observații confirmate

Statuturile folosite sunt: **confirmat**, **probabil**, **necunoscut**.

## Rețea

| Element | Valoare | Statut |
|---|---:|---|
| IP cameră / gateway DHCP | `192.72.1.1` | confirmat pe dispozitivul testat |
| IP client observat | `192.72.1.100` | confirmat |
| HTTP | TCP 80 | confirmat |
| RTSP | TCP 554 deschis | confirmat; ruta din APK nu este publicată de firmware-ul testat |
| Server | `AIT Multimedia Network Solution, UPnP/1.0 devices/1.6.19` | confirmat |

Nu există token sau autentificare HTTP în requesturile confirmate. Acest lucru nu exclude un handshake pentru alte funcții.

Serverul vechi a răspuns inconsistent sau cu 404 la clientul HTTP/1.1 din Node. Transportul CLI folosește explicit HTTP/1.0 peste socket TCP, varianta confirmată reproductibil pe dispozitiv.

## Status

```http
GET /cgi-bin/Config.cgi?action=get&property=status HTTP/1.0
Host: 192.72.1.1
```

Răspuns confirmat:

```text
0
OK
status=
```

Formatul general este `cod`, `mesaj`, apoi linii `cheie=valoare`.

## Proprietăți CGI confirmate (get pe 866)

```text
Camera.Menu.UIMode          (ex. VIDEO / PLAYBACK)
Camera.Menu.VideoRes        (ex. 1080P60)
Camera.Menu.GSensor         (ex. LEVEL2)
Camera.Menu.HDR             (ON/OFF)
Camera.Menu.EV              (ex. EV0)
Camera.Menu.LCDPower        (ex. 3MIN)
Camera.Preview.Source.1.Camid
Vendor.DeviceInfo.1080P
Vendor.DeviceInfo.LiveView
Vendor.DeviceInfo.SupportMjpegStream
broadcast                   (intermitent 799)
```

Endpoint:

```text
/cgi-bin/Config.cgi?action=get&property=<proprietate>
```

## Listare fișiere

```http
GET /cgi-bin/Config.cgi?action=dir&property=DCIM&format=all&count=5&from=0 HTTP/1.0
```

Pentru listare completă, aplicația folosește valorile `Normal`, `Event`, `Parking` și `Photo` în parametrul `property`. Fiecare categorie are propria paginare, pornind de la `from=0`:

```http
GET /cgi-bin/Config.cgi?action=dir&property=Parking&format=all&count=32&from=0 HTTP/1.0
```

Răspuns confirmat:

```xml
<DCIM>
  <file>
    <name>/SD/Normal/F/FILE260714-185923F.MP4</name>
    <format size="1920x1080" fps="60" time="180.2">MP4</format>
    <size>389414912</size>
    <attr>RW</attr>
    <time>2026-07-14 18:59:23</time>
  </file>
  <amount>5</amount>
</DCIM>
```

Rădăcina XML corespunde proprietății cerute, de exemplu `<Parking>`. `amount` descrie numărul de intrări din pagina curentă. `from` este un offset zero-based: testele live cu `from=0`, `32`, `64` și `96` au returnat pagini consecutive. Listarea se oprește când pagina este goală sau are mai puține intrări decât `count`. `F` este camera frontală; `R` este probabil camera spate.

## Acces fișier

Fișierul este accesibil direct folosind calea din XML:

```http
HEAD /SD/Normal/F/FILE260714-185923F.MP4 HTTP/1.0
```

Răspuns confirmat: HTTP 200, `Content-Length` corect și `Content-Type: video/mpeg`. Fișierul `.NMEA` asociat este accesibil similar și folosește `application/octet-stream`.

Suportul `Range` este necunoscut: serverul nu a furnizat un răspuns complet la testul limitat. Clientul nu trebuie să pretindă resume până la confirmare.

Comanda CLI de download folosește un GET HTTP/1.0 secvențial. Înaintea transferului face `HEAD`, compară `Content-Length` din HEAD și GET, scrie într-un fișier `.part`, validează numărul final de octeți și abia apoi redenumește fișierul. Nu suprascrie fișiere existente.

## Live view RTSP

APK-ul construiește URL-ul `rtsp://<ip>/liveRTSP/av4` când `Vendor.DeviceInfo.SupportMjpegStream=NO`; pentru configurații multiple apar și `av5`, `av6`, `av7`. Serverul testat pe portul 554 răspunde `200 OK` la `OPTIONS` și anunță `DESCRIBE, SETUP, TEARDOWN, PLAY, PAUSE, GET_PARAMETER`, dar răspunde `404 Not Found` la `DESCRIBE` pentru rădăcină și toate rutele `av1`–`av7`. Firmware-ul raportează `Vendor.DeviceInfo.LiveView=NO`; nu a fost trimisă nicio comandă de activare sau modificare.

## Sidecar NMEA

Fișierul cu aceeași bază ca MP4 și extensia `.NMEA` este text ASCII. Conține fraze standard `GPRMC`, `GPGGA`, `GPGSA`, `GPGSV` și extensia accelerometrului `$GSENSORD,x,y,z`. Eșantionarea observată este de un set pe secundă. Comanda `gpx` validează checksum-urile NMEA și exportă poziția, timpul UTC, altitudinea, viteza și direcția.

## Comenzi observate în APK (probe experimental)

> **CARANTINĂ JURIDICĂ / MOBIL:** această secțiune provine din analiză statică APK (`apk-observed`) și include operații mutabile (`set`/`del`). Nu se promovează în production doar pe baza APK. Observațiile pot informa o implementare independentă numai după documentare, validare pe o cameră deținută legal și, unde este necesar, opinie scrisă a avocatului. Vezi [docs/legal/ip-review.md](legal/ip-review.md), [docs/legal/clean-room-record.md](legal/clean-room-record.md) și [docs/mobile/phase0-audit.md](mobile/phase0-audit.md).

```text
/cgi-bin/Config.cgi?action=del&property=
/cgi-bin/Config.cgi?action=reardir&property=
/cgi-bin/Config.cgi?action=incabindir&property=
/cgi-bin/Config.cgi?action=frontincabindir&property=
/cgi-bin/Config.cgi?action=set&property=SendStopLiveView&value=ON
```

Dovezi statice din APK. Pe MiVue 866 pot fi validate cu CLI:

```powershell
npm run dev -- probe get --property status --host 192.72.1.1
npm run dev -- probe set --property Camera.Menu.UIMode --value PLAYBACK --dry-run
npm run dev -- probe set --property Camera.Menu.UIMode --value PLAYBACK --confirm
npm run dev -- probe del --path /SD/Parking/F/PARK….MP4 --dry-run
npm run dev -- probe del --path /SD/Parking/F/PARK….MP4 --confirm
```

- `set` / `del` fără `--confirm` sunt dry-run.
- Allowlist set: `Camera.Menu.UIMode` — valoare confirmată live: `PLAYBACK` (`MENU`/`UNKNOWN` → 701).
- Delete confirmat live: `action=del&property=/SD/…` → `0 OK`, HEAD ulterior 404.
- Format card SD: **exclus temporar**.
- Dashboard mutate: `MIVUE_ALLOW_MUTATE=1`.
- Firmware update rămâne dezactivat.

## Software identity (Firmware / SafetyCam / Voice / SSID) — Laneory Settings

Status: **camera-confirmed** pe Mio MiVue 866 (GET only, 2026-07-24).

### Endpoint-uri confirmate (GET only — fără `set` / `del`)

| Proprietate | UI | Exemplu observat |
|---|---|---|
| `Vendor.DeviceInfo.Version.Firmware` | Firmware | `VI100.24.50.BE1WD.10` |
| `Vendor.DeviceInfo.Version.SpeedCam` | Safety camera data | `V82.0706.01.25` |
| `Vendor.DeviceInfo.Version.Voice` | Voice package | `V01.0829.01.RO` |
| `Net.WIFI_AP.SSID` | Camera Wi-Fi | `MiVue_db:8c` |

`GET /cgi-bin/Config.cgi?action=get&property=<name>` → `0 OK` + valoarea.

**Siguranță:** se cer numai aceste nume exacte. Nu se folosește `Net.*` (poate expune chei Wi-Fi). Nu se mapează header-ul `Server` AIT ca firmware. Nu se fac mutații pentru aceste câmpuri.

### Note

- `status` și lista scurtă `READABLE_CAMERA_PROPERTIES` (CLI) **nu** includ aceste chei; refresh-ul Settings le citește separat.
- SSID: prioritate CGI `Net.WIFI_AP.SSID`; fallback OS dacă lipsește.
- Limba voice nu e o proprietate CGI separată pe 866; se afișează `Version.Voice`.
- `Camera.Menu.FWversion` (numeric) există, dar Dashcam info folosește `Vendor.DeviceInfo.Version.Firmware`.

### Verificare anterioară (înlocuită)

Probele din 2026-07-24 pe `status` + lista scurtă au raportat greșit absența — cheile erau pe `Vendor.DeviceInfo.Version.*` / `Net.WIFI_AP.SSID`, necerute atunci.

## Capacitate card SD (total / free / used)

Status (2026-07-27): **nu există încă CGI `camera-confirmed` pentru total/free bytes**. Transportul de rețea pentru capacitate rămâne neconfirmat.

Cercetare locală (XAPK `1.1.220.1`, DEX): vezi `.analysis/sd-storage-endpoint/` (gitignored).

### camera-confirmed — UI fizic MiVue 866 only (transport CGI neconfirmat)

Pe ecranul camerei **System → Storage Allocation** (observație pe dispozitiv deținut legal; fără promovare de endpoint):

- afișează capacitatea **`58 GB`** (constantă pe cele patru profiluri observate) pentru un card nominal **64 GB**, formatat și gol — interpretare: capacitate **utilizabilă**, nu spațiu ocupat; tot fără transport CGI confirmat;
- patru profiluri de **alocare** (nu usage): Normal / Event / Parking / Photo;
- Profile 1: 70 / 8 / 8 / 1; Profile 2: 62 / 16 / 8 / 1; Profile 3: 58 / 8 / 20 / 1; Profile 4: 78 / 8 / Parking Off / 1;
- procentele vizibile însumează 87% pe fiecare profil (Parking Off = 0); semnificația restului de 13% este **nedovedită**.

Această observație **nu** specifică un endpoint CGI și **nu** autorizează hardcodarea `58 GB` în production.

### apk-observed — status / alocare / capabilități (nu capacitate în bytes)

| Property (GET) | Rol aparent | Notă |
|---|---|---|
| `Camera.Menu.StorageAllocation` | index profil/tip alocare | app oficială: ecran Type 1/2/3; SET potențial legat de format — **nu SET** |
| `Camera.Menu.List.StorageAllocation` | lista opțiunilor | în dump APK fără `=…` sample |
| `Camera.Menu.SD0` | stare card; sample dump `READY` | enum, nu bytes |
| `Camera.Menu.SDState` | stare card (nume) | valoare neconfirmată live |
| `Vendor.DeviceInfo.SDCardError` | flag eroare card | capabilitate/stare |
| `Vendor.DeviceInfo.SDType1` / `SDType2` / `SDType3` | tip/capabilitate alocare | legate de note Type 1/2/3, nu de GB |
| `Vendor.DeviceInfo.FormatFreeSDcard` | flag feature format | **doar GET**; format rămâne exclus |

`FreeSpace` / `TotalSpace` / `AvailableSpace` apar în APK ca API-uri de **spațiu local pe telefon** (download gate), nu ca `Camera.Menu.*` CGI pentru capacitatea cardului.

`property=status` live: `0 OK` + `status=` gol — fără câmpuri de capacitate.

Nu s-au găsit în XAPK stringuri `58 GB` sau tabelele de procente 70/8/8/1 etc. — acestea apar pe UI-ul firmware, nu ca resurse ale aplicației.

### Reguli produs

- Nu se inventează proprietăți CGI și nu se promovează `apk-observed` direct în production.
- Pe camere live, UI-ul Settings folosește `Storage information unavailable for this camera` până când există GET confirmat pentru **total** (și free/used dacă e cazul) cu unități documentate.
- Nu hardcoda `58 GB` din UI-ul fizic.
- Demo Mode poate folosi bytes deterministe numai ca preview UI.
- Spațiul ocupat **nu** se deduce din suma fișierelor listate în Library și **nu** din procentele de alocare.

### Validare pe MiVue 866 (read-only)

Cu Wi‑Fi cameră activ:

```text
npm run dev -- probe get --property status --host 192.72.1.1
npm run dev -- probe get --property Vendor.DeviceInfo.Version.Firmware --host 192.72.1.1
npm run dev -- probe get --property Camera.Menu.StorageAllocation --host 192.72.1.1
npm run dev -- probe get --property Camera.Menu.List.StorageAllocation --host 192.72.1.1
npm run dev -- probe get --property Camera.Menu.SD0 --host 192.72.1.1
npm run dev -- probe get --property Camera.Menu.SDState --host 192.72.1.1
npm run dev -- probe get --property Vendor.DeviceInfo.SDCardError --host 192.72.1.1
npm run dev -- probe get --property Vendor.DeviceInfo.SDType1 --host 192.72.1.1
npm run dev -- probe get --property Vendor.DeviceInfo.SDType2 --host 192.72.1.1
npm run dev -- probe get --property Vendor.DeviceInfo.SDType3 --host 192.72.1.1
```

Negativ (capacitate inventată):

```text
npm run dev -- probe get --property FreeSpace --host 192.72.1.1
npm run dev -- probe get --property TotalSpace --host 192.72.1.1
npm run dev -- probe get --property Camera.Menu.FreeSpace --host 192.72.1.1
```

Nu rula format / SET pe `StorageAllocation` sau proprietăți SD pentru această cercetare.
