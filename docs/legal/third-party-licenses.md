> **MATERIAL PREGĂTITOR — NU CONSTITUIE CONSULTANȚĂ JURIDICĂ. Necesită revizuire de avocat RO/UE specializat în software și proprietate intelectuală înainte de orice folosire comercială.**  
> **DRAFT · Legal review required**

# Inventar licențe terțe (mobil Laneory)

**Sursă de adevăr în aplicație:** `mobile/generated/thirdPartyLicenses.json` (și `.ts`), generat din `mobile/package-lock.json` + fișierele LICENSE din `node_modules`.

**Generator:** `mobile/scripts/generate-third-party-licenses.cjs`  
**Comenzi:**

```text
npm run licenses:generate
npm run licenses:check
```

Nu citi `node_modules` la runtime. Inventarul este un artifact static inclus în bundle.

## Reguli

- se înregistrează versiunea exactă din lockfile;
- se verifică textul de licență de pe disc când există;
- dependențele marcate `dev` / `devOptional` în lockfile sunt excluse;
- OpenStreetMap / tile CDN sunt atribuite separat (nu ca pachet npm);
- Leaflet 1.9.4 este încărcat din CDN în WebView pentru Online map — documentat în `mapAttribution`, nu ca dependență npm;
- lipsa licenței sau a textului = **release blocker** până la rezolvare.

## Stare curentă (generată)

Vezi câmpurile din artifact:

- `packageCount`
- `lockfileSha256Prefix`
- `blockers[]`
- `mapAttribution`

### Blocker cunoscut: `http10-tcp`

Modulul local `mobile/modules/http10-tcp` **nu declară** câmp `license` în `package.json`.  
**Nu presupune MIT.** Clarifică înainte de release dacă este cod proprietar Laneory sau open-source, apoi adaugă SPDX + text LICENSE.

Alte intrări din `blockers` (ex. lipsă fișier LICENSE pe disc pentru un SPDX cunoscut) trebuie triate înainte de store submit.

## Atribuire hartă (separat de inventarul npm)

- Map data © OpenStreetMap contributors
- Leaflet CDN + termeni tile OpenStreetMap — vezi Privacy Policy draft și sheet-ul Open-source licences din app

## Evidențe la fiecare release

- regenerare inventar după schimbarea lockfile-ului;
- `npm run licenses:check` verde (hash + count);
- trierea `blockers`;
- notice afișat în Settings → About Laneory → Open-source licences;
- aprobare juridică pentru copyleft, fonturi (OFL), hărți și CDN.
