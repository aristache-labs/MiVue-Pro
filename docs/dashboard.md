# MiVue Local Dashboard

## Pornire

```powershell
npm run dev -- web --host 192.72.1.1
```

Interfața este disponibilă la `http://127.0.0.1:4173`. Portul poate fi schimbat cu `--port`.

## Flux

1. Citește secvențial informațiile și toate cele patru categorii ale camerei.
2. Filtrează local după categorie, dată sau nume.
3. La selectarea unui clip, descarcă MP4 și NMEA numai dacă nu există deja.
4. Copiază video H.264 fără recodare și convertește doar pista ADPCM în AAC.
5. Parsează NMEA, validează checksum-urile și desenează traseul pe un canvas local.
6. Sincronizează viteza, timpul, altitudinea și markerul traseului cu timpul playerului.

## Model de securitate

- serverul ascultă numai pe `127.0.0.1`;
- nu există requesturi către tile-uri de hartă sau servicii cloud;
- căile remote trebuie să înceapă cu `/SD/`, iar dashboardul acceptă numai video;
- fișierele locale sunt limitate la nume simple din folderul `downloads`;
- corpurile JSON sunt limitate la 32 KiB;
- răspunsurile includ CSP, `nosniff` și `Referrer-Policy: no-referrer`;
- operațiile camerei rămân GET/HEAD read-only.

## Validare live

- 210 fișiere afișate, dintre care 126 Parking;
- pregătirea clipului test a ales copia AAC verificată;
- 7 puncte GPS încărcate pentru clipul test;
- streamingul local răspunde corect cu HTTP 206 pentru intervale media;
- 29 de teste automate trec.
