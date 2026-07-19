# MiVue 866 CLI

Client CLI TypeScript experimental pentru interoperabilitate read-only cu camera auto Mio MiVue 866. Protocolul implementat aici a fost confirmat direct pe o cameră deținută de utilizator; nu este o documentație oficială Mio.

## Stadiu

- `discover`: detectează camera din interfețele IPv4 locale și validează endpointul `status`;
- `info`: citește statusul și câteva capabilități confirmate;
- `list`: listează metadatele fișierelor din `Normal`, `Event`, `Parking` și `Photo`, inclusiv paginare completă;
- `download`: transferă streaming direct pe disc, cu progres, viteză, ETA, anulare și validarea dimensiunii;
- `gpx`: convertește local sidecar-urile `.NMEA` în trasee GPX și verifică checksum-urile;
- `web`: pornește dashboardul local cu miniaturi, filtre/sortare, progres real, redare AAC și traseu GPS sincronizat;
- delete, setări și firmware: neimplementate;
- RTSP: ruta din APK este confirmată, dar firmware-ul testat nu publică live-view.

## Cerințe

- Node.js 20 sau mai nou;
- laptop conectat la Wi-Fi-ul camerei;
- opțional, Ethernet pentru acces simultan la internet.

Camera testată a oferit laptopului `192.72.1.100`, iar gateway-ul camerei a fost `192.72.1.1`. CLI-ul încearcă să-l detecteze, dar se poate indica explicit.

## Instalare și rulare

```powershell
npm install
npm run dev -- discover
npm run dev -- info --host 192.72.1.1
npm run dev -- list --host 192.72.1.1 --count 5
npm run dev -- list --host 192.72.1.1 --category parking --json
npm run dev -- list --host 192.72.1.1 --all --summary
npm run dev -- download /SD/Parking/F/PARK260716-033609F.MP4 --host 192.72.1.1 --output ./downloads
npm run dev -- gpx ./downloads/PARK260716-033609F.NMEA
npm run dev -- web --host 192.72.1.1
```

Dashboardul se deschide la `http://127.0.0.1:4173` și ascultă exclusiv pe interfața locală. Lista este ordonată implicit cu cele mai recente fișiere primele și poate fi filtrată după categorie, cameră, durată și dată sau sortată după dată, oră, durată, mărime și nume. Miniaturile sunt citite read-only din endpointul camerei, cu pool de 2 cereri concurente, și sunt păstrate în cache pe disc + memorie.

Selectarea unei filmări nu pornește niciun transfer. Descărcarea începe numai din butonul `Descarcă` al cardului (sau din selecția multiplă); cererile multiple intră într-o coadă procesată una câte una. Dashboardul afișează progresul real, toast-uri la finalizare, favorite locale, spațiu ocupat în `downloads/`, și poate deschide folderul în Explorer. Traseul schematic rămâne complet local. Harta OpenStreetMap este opțională.

## Performanță

- lista de fișiere este cache-uită ~25s pe server; butonul Reîncarcă forțează refresh (`?refresh=1`);
- `/api/files` poate fi comprimat gzip; fișierele statice folosesc ETag + `no-cache`;
- lista din browser folosește lazy thumbnails, virtualizare peste ~80 rânduri și densitate Compact/Confortabil;
- dacă proiectul stă pe OneDrive, exclude folderul `downloads/` din sincronizare (Settings OneDrive → Choose folders). Scrierile MP4/thumbnail pe un folder sincronizat pot încetini Node.

Downloadul scrie mai întâi `<fișier>.part` și redenumește fișierul numai după ce dimensiunea primită corespunde cu `Content-Length`. `Ctrl+C` anulează transferul și păstrează fișierul `.part` pentru diagnostic. Fișierele existente nu sunt suprascrise.

Pentru diagnostic:

```powershell
npm run dev -- discover --debug
```

Build și teste:

```powershell
npm run check
```

## Limitări curente

Firmware-ul testat dezactivează sau retrage uneori punctul de acces Wi-Fi. CLI-ul folosește timeout și retry pentru operațiile scurte, dar nu poate reactiva Wi-Fi-ul fizic al camerei. Downloadul nu se reia automat, deoarece suportul HTTP Range nu este confirmat. Paginarea cu `from` este confirmată, însă listarea completă este limitată intern la 10.000 de fișiere pentru siguranță. Portul RTSP răspunde, dar firmware-ul declară `Vendor.DeviceInfo.LiveView=NO` și nu publică niciunul dintre fluxurile `av1`–`av7` cunoscute din APK.

Detalii: [dashboard](docs/dashboard.md), [protocol](docs/protocol.md), [cercetare](docs/research-notes.md), [depanare](docs/troubleshooting.md), [securitate și legal](docs/security-and-legal.md).
