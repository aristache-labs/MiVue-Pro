# MiVue Local Dashboard

## Pornire

```powershell
npm run dev -- web --host 192.72.1.1
```

Interfața este disponibilă la `http://127.0.0.1:4173`. Portul poate fi schimbat cu `--port`.

## Flux

1. Citește secvențial informațiile și toate cele patru categorii ale camerei (cu cache listă ~25s).
2. Filtrează local după categorie, favorite, dată (inclusiv presetări rapide), cameră, durată sau nume.
3. Selecție multiplă: Descarcă / Șterge local în lot.
4. La selectarea unui clip, descarcă MP4 și NMEA numai dacă nu există deja.
5. Copiază video H.264 fără recodare și convertește doar pista ADPCM în AAC.
6. Parsează NMEA, validează checksum-urile și desenează traseul pe un canvas local (sau OSM opțional).
7. Sincronizează viteza, timpul, altitudinea și markerul traseului cu timpul playerului.

## Funcții dashboard

- favorite locale (persistate în `localStorage`);
- toast la finalizarea/eroarea descărcărilor;
- card Spațiu local + „Deschide folderul” (`explorer.exe`);
- skeleton loading și stări empty/error cu Reîncearcă.

## Performanță

- thumbnail pool (max 2 pe cameră) + cache memorie/disk;
- gzip pe `/api/files`, ETag pe assets;
- virtualizare listă pentru biblioteci mari;
- recomandare: exclude `downloads/` din sincronizarea OneDrive dacă proiectul e pe OneDrive.

## Model de securitate

- serverul ascultă numai pe `127.0.0.1`;
- nu există requesturi către tile-uri de hartă până la activarea hărții online;
- căile remote trebuie să înceapă cu `/SD/`, iar dashboardul acceptă numai video pentru prepare;
- fișierele locale sunt limitate la nume simple din folderul `downloads`;
- DELETE `/api/local` șterge numai copii locale, niciodată pe cameră;
- corpurile JSON sunt limitate la 32 KiB;
- răspunsurile includ CSP, `nosniff` și Referrer-Policy;
- operațiile camerei rămân GET/HEAD read-only.

## Validare live

- listă mare (sute de fișiere) cu filtre + virtualizare;
- pregătirea clipului alege copia AAC verificată;
- streaming local cu HTTP 206 pentru intervale media;
- teste automate `npm test`.
