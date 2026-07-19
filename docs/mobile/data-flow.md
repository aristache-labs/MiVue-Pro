# Data-flow tehnic — aplicație mobilă

**Statut:** Faza 1  
**Privacy legal:** [../legal/privacy-data-flow.md](../legal/privacy-data-flow.md)  
**Produs:** `[NUMELE_APLICAȚIEI]`

## 1. Flux principal (local-first)

```mermaid
flowchart TD
  start[Onboarding / Wi-Fi cameră]
  disc[Discovery sau IP manual]
  status[GET status Config.cgi]
  list[GET dir paginat pe categorii]
  cache[Cache catalog local_db]
  ui[Library UI + lazy thumbs]
  enqueue[Utilizator apasă Descarcă]
  q[download_queue persistentă]
  head[HEAD /SD/...]
  get[GET HTTP/1.0 streaming]
  part[Scrie fișier.part]
  val[Validare dimensiune]
  final[Rename destinație]
  play[Player local + NMEA sync]
  mapLocal[Hartă schematică locală]
  export[Export explicit share sheet]

  start --> disc --> status
  status -->|OK| list --> cache --> ui
  ui -->|tap card| detail[Detalii - fără download]
  ui --> enqueue --> q
  q -->|un activ| head --> get --> part --> val --> final
  final --> play --> mapLocal
  final --> export
```

Reguli:

- Nicio săgeată către serverele dezvoltatorului în profilul de bază.
- Selectarea cardului ≠ enqueue.
- Un singur `get` media activ către cameră.

## 2. Etape download (detaliu)

| Etapă | Date în memorie | Date pe disc | Ieșire la eșec |
|---|---|---|---|
| queued | id, path remote hash/sanitized, size așteptat | rând coadă în DB | rămâne queued |
| head | Content-Length | — | failed; retry controlat |
| transferring | buffer stream mic | `.part` | păstrează/curăță `.part` per politică; fără resume fals |
| validating | size counters | `.part` | nu rename |
| completed | — | fișier final | — |
| cancelled | — | `.part` opțional | utilizatorul decide cleanup |

## 3. Thumbnails

```mermaid
flowchart LR
  card[Card vizibil] --> pool[Pool max 2 cereri]
  pool --> thGet[GET/HEAD media thumb endpoint sau frame]
  thGet --> disk[Cache disc privat]
  disk --> mem[Cache memorie LRU]
```

Serializare/limită obligatorie; eșec thumb ≠ eșec listă.

## 4. GPS / NMEA

1. Sidecar `.NMEA` descărcat sau citit local.
2. Parser validează checksum; produce eșantioane în memorie pentru scrub.
3. Export GPX la cerere, cu creator/namespace proprii (fără „MiVue”).
4. Coordonatele nu apar în loguri producție.

## 5. Ramură opțională — hartă online

```mermaid
flowchart LR
  consent[Consimțământ / setare explicită]
  app[Map feature]
  tile[Furnizor tile HTTPS]

  consent -->|da| app
  app -->|"IP, UA, tile coords/viewport"| tile
  tile -->|tiles| app
```

Înainte de primul request: actualizare privacy, App Privacy, Data Safety; atribuire OSM + furnizor; alternativă offline. Nu se folosește `tile.openstreetmap.org` ca infrastructură garantată de produs.

## 6. Demo Mode

Înlocuiește `camera_transport` cu `demo` repository: aceleași tipuri `RemoteFile`, progres simulat, media sintetică. Nu emite trafic către IP-uri de cameră. Vezi [demo-mode.md](demo-mode.md).

## 7. Date care nu circulă

- Parola Wi‑Fi
- Cont utilizator / advertising ID
- Upload cloud automat
- Analytics / crash SDK (implicit dezactivate)
- Comenzi `set` / `del`
