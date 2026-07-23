# AGENTS.md — reguli pentru agenți în MiVue Pro / `Laneory`

Acest repository conține un CLI TypeScript + dashboard local pentru interoperabilitate cu camere auto deținute legal, plus o aplicație mobilă comercială independentă (nu oficială Mio/MiTAC).

Produsul poate efectua atât operații read-only, cât și operații mutative asupra camerei. Operațiile trebuie să fie confirmate ca suportate de modelul și firmware-ul conectat, validate înainte de execuție și implementate prin infrastructura centralizată de protocol și mutații.

## Obligatoriu

- Sunt permise operații read-only și mutative asupra unei camere deținute legal de utilizator.
- Sunt permise toate setările confirmate ca suportate de modelul și firmware-ul conectat, nu doar Frequency, EV, Date & Time, Time Zone și Daylight Saving Time.
- Sunt permise operații complete de gestionare a fișierelor, inclusiv listare, metadata, preview, download, copiere, mutare, redenumire, protejare/deprotejare, schimbare categorie, ștergere, ștergere bulk, sincronizare, curățare pe bază de reguli și formatarea cardului SD, dacă protocolul și camera confirmă suportul.
- Sunt permise operații automate read-only și mutative, inclusiv polling, sincronizare, download automat, aplicare profiluri, schimbări automate de setări, organizare, protejare/deprotejare, ștergere automată, curățare și formatare condiționată sau programată.
- Nu presupune că două modele sau versiuni de firmware folosesc aceleași endpoint-uri, valori, limite ori comportamente.
- Orice operație necunoscută, neverificată sau incompatibilă trebuie blocată în mod sigur.
- Nu prezenta succesul până când răspunsul camerei nu este validat și starea rezultată nu este verificată din nou.

## Setări cameră

- Pot fi implementate toate proprietățile `set` confirmate prin sursele permise și validate pe o cameră deținută legal.
- Pentru fiecare setare documentează:
  - endpoint-ul sau comanda;
  - metoda HTTP;
  - tipul și schema valorii;
  - valorile acceptate;
  - intervalele și limitele;
  - modelele și versiunile de firmware testate;
  - răspunsul de succes;
  - răspunsurile de eroare;
  - metoda de verificare post-execuție.
- Pentru operațiile manuale `set`, afișează când este posibil:
  - valoarea curentă;
  - valoarea propusă;
  - camera, modelul și firmware-ul detectat;
  - eventualele efecte secundare;
  - rezultatul verificării după aplicare.
- Confirmarea individuală poate fi omisă pentru setările incluse explicit de utilizator într-un profil, preset, workflow sau automatizare activată voluntar.
- Nu implementa o setare numai pentru că un nume de parametru apare într-un APK, XAPK, log sau răspuns izolat. Parametrul trebuie validat înainte de promovarea în cod production.

## Gestionarea fișierelor

- Sunt permise:
  - listarea fișierelor și directoarelor;
  - citirea metadata;
  - preview;
  - download și resume;
  - copiere;
  - mutare;
  - redenumire;
  - protejare și deprotejare;
  - schimbarea categoriei;
  - organizare;
  - sincronizare;
  - export;
  - ștergere individuală;
  - ștergere bulk;
  - curățare automată;
  - formatarea cardului SD.
- Înainte de orice operație asupra fișierelor:
  - normalizează și validează calea;
  - blochează path traversal;
  - verifică existența țintei;
  - confirmă că ținta aparține spațiului de stocare expus de cameră;
  - blochează wildcard-uri sau selecții nevalidate;
  - revalidează selecția imediat înainte de execuție;
  - tratează dispariția sau modificarea țintei ca rezultat parțial ori eșuat.
- Pentru ștergeri manuale, afișează numărul fișierelor, dimensiunea totală dacă este disponibilă și țintele validate.
- Pentru operații bulk, destructive sau automate:
  - utilizatorul trebuie să activeze explicit regula;
  - criteriile trebuie să fie vizibile și verificabile;
  - oferă `dry-run` sau preview atunci când este tehnic posibil;
  - păstrează jurnalul fișierelor selectate și rezultatul fiecărei operații;
  - nu extinde selecția dincolo de criteriile definite.

## Formatarea cardului SD

- Formatarea cardului SD este permisă.
- Pentru declanșarea manuală:
  - afișează avertisment clar că datele vor fi șterse;
  - afișează camera și cardul țintă;
  - revalidează conexiunea, modelul, firmware-ul și capabilitatea;
  - solicită confirmare întărită, de exemplu text introdus de utilizator.
- Formatarea automată este permisă numai dacă utilizatorul a creat și activat explicit o regulă care definește:
  - condiția de declanșare;
  - camera vizată;
  - intervalul de execuție;
  - criteriile de siguranță;
  - notificarea;
  - comportamentul în caz de eroare.
- Nu formata cardul accidental ca efect secundar al bootstrap-ului, reconectării sau unui retry generic.

## Automatizări

- Sunt permise toate automatizările read-only și mutative configurate explicit de utilizator.
- Automatizările pot include:
  - refresh și polling;
  - sincronizare și download automat;
  - aplicarea profilurilor;
  - schimbarea automată a setărilor;
  - organizarea fișierelor;
  - protejarea sau deprotejarea automată;
  - ștergerea automată;
  - curățarea pe baza unor reguli;
  - formatarea programată sau condiționată.
- Orice automatizare mutativă trebuie:
  - creată sau activată explicit de utilizator;
  - să descrie clar condiția, acțiunea și ținta;
  - să aibă stare vizibilă `enabled` / `disabled`;
  - să poată fi oprită imediat;
  - să fie limitată la o cameră, un profil sau un set de ținte identificabile;
  - să aibă protecție împotriva execuțiilor duplicate;
  - să aibă rate limits și debounce unde este relevant;
  - să păstreze jurnal de audit;
  - să distingă rezultatele reușite, eșuate, parțiale și necunoscute;
  - să revalideze conexiunea, identitatea camerei, modelul, firmware-ul, capabilitatea și ținta înainte de execuție.
- Nu transforma automat o acțiune manuală într-o automatizare fără activarea explicită a utilizatorului.

## Politica requesturilor și retry

Clasifică fiecare request:

- `read`;
- `mutation-idempotent`;
- `mutation-non-idempotent`;
- `destructive`;
- `maintenance`.

Reguli:

- Operațiile read-only pot folosi retry automat cu backoff și jitter.
- Operațiile mutative idempotente pot folosi retry numai dacă idempotency-ul a fost demonstrat, starea este verificată înaintea repetării și repetarea nu poate dubla ori inversa efectul.
- Operațiile mutative non-idempotente și destructive nu se repetă automat în mod implicit.
- În caz de timeout sau răspuns ambiguu după o mutație:
  1. nu presupune automat că operația a eșuat;
  2. citește din nou starea camerei;
  3. verifică dacă efectul a fost aplicat;
  4. marchează rezultatul `success`, `failed` sau `unknown`;
  5. cere intervenție manuală dacă starea nu poate fi determinată sigur.
- Nu reutiliza politica generică de retry pentru mutații.

## Validarea conexiunii și a țintei

Imediat înaintea unei mutații verifică:

- că dispozitivul este o cameră suportată;
- identificatorul camerei;
- modelul;
- versiunea de firmware;
- sesiunea sau conexiunea activă;
- capabilitatea solicitată;
- valoarea sau fișierul țintă;
- faptul că ținta nu s-a schimbat;
- faptul că utilizatorul sau automatizarea are permisiunea necesară.

Dacă modelul, firmware-ul, sesiunea sau ținta s-au schimbat, anulează operația și reia validarea.

Nu identifica o cameră exclusiv după adresa IP.

## Arhitectura mutațiilor

- Toate mutațiile trebuie să treacă printr-un strat centralizat, de exemplu `cameraMutate.ts` sau serviciul echivalent din aplicația mobilă.
- Folosește un registru central de capabilități și validatoare comune.
- Nu trimite requesturi mutative direct din componente UI, hooks, ecrane, polling jobs sau cod de navigație.
- Codul generic de `probe` rămâne tooling de dezvoltare și nu se importă în produsul mobil.
- Separă clar:
  - descoperirea protocolului;
  - observațiile provenite din APK/XAPK;
  - capabilitățile confirmate pe cameră;
  - implementarea production;
  - automatizările utilizatorului;
  - operațiile experimentale.

## Audit și observabilitate

Pentru fiecare mutație înregistrează cel puțin:

- timestamp;
- sursa: utilizator, preset, automatizare sau CLI;
- camera țintă;
- modelul și firmware-ul;
- operația;
- parametrii validați, fără secrete;
- valoarea anterioară, dacă există;
- valoarea solicitată;
- răspunsul camerei;
- rezultatul verificării;
- starea finală;
- retry-urile;
- erorile și rezultatele parțiale.

Nu înregistra parole, token-uri, chei private, certificate private sau alte credențiale.

## Materiale locale de analiză

Agenții pot accesa și analiza local:

- `.analysis/`;
- `androguard.db`;
- `MiVue+Pro_*.xapk`;
- APK/XAPK oficiale obținute legal de utilizator;
- manifestele și structura pachetelor;
- rezultate de analiză statică;
- cod decompilat utilizat exclusiv ca referință locală;
- endpoint-uri, comenzi, enum-uri, scheme și structuri de protocol;
- resurse tehnice strict necesare identificării capabilităților și compatibilității.

Aceste materiale pot fi folosite pentru:

- identificarea endpoint-urilor;
- identificarea parametrilor și valorilor acceptate;
- analizarea requesturilor și răspunsurilor;
- identificarea diferențelor dintre modele și firmware-uri;
- verificarea implementării originale din `src/`;
- completarea `docs/protocol.md`;
- actualizarea registrului de capabilități;
- actualizarea matricei de compatibilitate;
- dezvoltarea unei implementări originale pentru Laneory.

Informațiile provenite din aceste materiale trebuie clasificate:

- `apk-observed` — observat în APK/XAPK sau decompilare;
- `camera-confirmed` — confirmat pe o cameră deținută legal;
- `production-validated` — implementat, testat și verificat complet.

O observație `apk-observed` nu este automat sigură, production-ready sau compatibilă cu toate modelele.

## Restricții pentru materialele oficiale analizate

- Materialele oficiale și rezultatele brute ale analizei rămân locale.
- Nu copia cod decompilat în codul produsului.
- Nu include APK/XAPK, baze Androguard, directoare de decompilare sau `.analysis/` în build-uri ori release-uri.
- Nu publica sau redistribui APK/XAPK.
- Nu distribui porțiuni substanțiale de cod decompilat.
- Nu copia resurse grafice, iconuri, texte, fonturi sau elemente de identitate Mio/MiTAC.
- Nu extrage, folosi sau distribui chei private, parole, token-uri, certificate private ori alte credențiale.
- Nu folosi certificatele sau identitatea aplicației oficiale pentru impersonare.
- Nu folosi analiza pentru ocolirea autentificării sau a controalelor de acces.
- Nu clona UI-ul aplicației MiVue Pro.
- Nu modifica, încărca sau redistribui firmware proprietar fără aprobare explicită și o metodă autorizată.

Pot fi transferate în codul produsului numai concluzii funcționale implementate independent, precum:

- structuri de request și răspuns;
- nume de proprietăți;
- valori acceptate;
- reguli de validare;
- comportamente de compatibilitate;
- descrieri factuale ale protocolului.

## Separarea dintre analiză și produs

Codul production nu trebuie să importe direct fișiere din:

- `.analysis/`;
- `androguard.db`;
- directoare de decompilare;
- APK/XAPK;
- fișiere generate de unelte de reverse engineering.

Fluxul recomandat:

1. analiza locală produce o observație;
2. observația este documentată în `docs/protocol.md` ca `apk-observed`;
3. comportamentul este verificat pe o cameră deținută legal;
4. compatibilitatea este actualizată în `docs/compatibility.md`;
5. implementarea originală este adăugată în `src/` sau `mobile/`;
6. sunt adăugate validări și teste;
7. capabilitatea este promovată la `camera-confirmed`;
8. după validarea completă devine `production-validated`.

## Mod experimental

- Modul experimental trebuie să fie separat de produsul normal.
- Trebuie să fie dezactivat implicit și activat explicit.
- Trebuie să afișeze riscurile și camera/firmware-ul vizate.
- Operațiile destructive experimentale trebuie blocate implicit.
- Rezultatele experimentale nu devin automat cod production.
- Nu include modul experimental în build-uri publice fără aprobare explicită.

## Operații interzise

Nu implementa și nu executa:

- accesarea camerelor fără permisiune;
- ocolirea autentificării;
- exploatarea vulnerabilităților pentru acces neautorizat;
- impersonarea aplicației oficiale;
- utilizarea cheilor sau certificatelor oficiale;
- bypass pentru semnături;
- dezactivarea mecanismelor de securitate;
- upload sau update de firmware nevalidat;
- downgrade forțat;
- modificarea firmware-ului prin metode nedocumentate.

Update-ul oficial de firmware poate fi adăugat numai dacă există o metodă publică, autorizată și documentată și dacă utilizatorul aprobă explicit implementarea și execuția.

## Excluderi Git

Următoarele rămân în `.gitignore`, inclusiv în `mobile/` unde este relevant:

- `.analysis/`;
- `.agents/`;
- `.cursor/`;
- `androguard.db`;
- `MiVue+Pro_*.xapk`;
- `*.apk`;
- `*.xapk`;
- directoare de decompilare;
- `downloads/`;
- `node_modules/`;
- `dist/`;
- `.env`;
- loguri brute de trafic;
- fișiere temporare cu identificatori, token-uri sau date sensibile.

Prezența în `.gitignore` nu interzice citirea sau analiza locală. Aceste materiale pot fi utilizate de agenți pentru interoperabilitate, dar nu trebuie adăugate în Git, distribuite sau incluse în build-uri.

## Reguli pentru agenți privind fișierele locale de analiză

Agenții pot:

- deschide și analiza `.analysis/`;
- interoga `androguard.db`;
- analiza `MiVue+Pro_*.xapk`;
- inspecta manifestul și structura APK/XAPK;
- căuta endpoint-uri, rute, parametri, enum-uri și structuri de date;
- compara observațiile cu implementarea din `src/`;
- utiliza scripturi locale de analiză;
- propune documentație și implementări originale.

Agenții trebuie:

- să limiteze analiza la interoperabilitatea cu dispozitive deținute legal;
- să păstreze materialele analizate în afara Git;
- să evite afișarea nejustificată a codului decompilat;
- să redacteze secretele și datele sensibile;
- să distingă clar observațiile din APK de comportamentele confirmate;
- să nu execute operații mutative necunoscute fără validare;
- să implementeze independent funcționalitatea în Laneory.

Agenții nu trebuie să refuze analiza acestor fișiere doar pentru că sunt în `.gitignore` sau provin din aplicația oficială, cu condiția ca utilizatorul să le fi obținut legal și scopul să fie interoperabilitatea legitimă.

## Surse permise pentru protocol

- Codul original din `src/`, inclusiv validările și infrastructura din `cameraMutate.ts`
- Codul generic de `probe`, numai ca tooling de dezvoltare
- [docs/protocol.md](docs/protocol.md), inclusiv observațiile marcate `apk-observed`
- [docs/compatibility.md](docs/compatibility.md)
- [docs/security-and-legal.md](docs/security-and-legal.md)
- [docs/legal/](docs/legal/)
- [docs/mobile/](docs/mobile/)
- `.analysis/`
- `androguard.db`
- `MiVue+Pro_*.xapk`
- APK/XAPK oficiale obținute legal
- Decompilări și rezultate locale de analiză statică
- Răspunsuri read-only și mutative de la o cameră deținută legal
- Capturi de trafic realizate de utilizator asupra propriei camere și propriei rețele
- Documentație publică Mio/MiTAC
- Documentație oficială Apple, Google, UE și a bibliotecilor folosite

## Cerințe pentru o capabilitate nouă

Înainte ca o capabilitate să fie considerată production-ready:

1. documentează observația în `docs/protocol.md`;
2. precizează dacă sursa este `apk-observed`, `camera-confirmed` sau `production-validated`;
3. actualizează modelele și firmware-urile testate în `docs/compatibility.md`;
4. adaugă schema valorilor și validările;
5. clasifică operația după politica de request;
6. adaugă verificarea pre-execuție;
7. adaugă verificarea post-execuție;
8. definește comportamentul la timeout;
9. definește politica de retry;
10. adaugă audit;
11. adaugă teste unitare;
12. adaugă teste de integrare cu mock-uri;
13. testează pe o cameră deținută legal;
14. documentează efectele secundare și recovery-ul;
15. actualizează UI-ul și confirmările;
16. verifică utilizarea în automatizări;
17. actualizează documentația juridică și de release când este relevant.

## CLI și aplicația mobilă

- Nu porni aplicația cu `npm start` / `npx expo start` — utilizatorul rulează CLI-ul.
- Folosește comenzi Windows, în principal PowerShell.
- Nu porni servere, emulatoare sau procese persistente fără cerere explicită.
- Nu publica și nu trimite build-uri către Apple/Google fără aprobare explicită.
- Nu modifica signing, store credentials sau configurații de release fără aprobare.
- Nu declara aplicația „aprobată legal”.
- Documentele din `docs/legal/` sunt materiale pregătitoare, nu confirmări juridice finale.

## Pointere utile

| Domeniu | Fișier |
|---|---|
| Protocol observat | `docs/protocol.md` |
| Compatibilitate modele/firmware | `docs/compatibility.md` |
| Securitate CLI/dashboard | `docs/security-and-legal.md` |
| Politici și mutații | `src/cameraMutate.ts` |
| Audit Faza 0 | `docs/mobile/phase0-audit.md` |
| ADR framework | `docs/mobile/adr-001-framework.md` (Expo prebuild acceptat) |
| Arhitectură mobilă | `docs/mobile/architecture.md` |
| App mobilă | `mobile/` — nu rula `expo start` / `npm start` pentru utilizator |
| Gate release juridic | `docs/legal/release-legal-checklist.md` |

## Brand

Nume produs mobil: **Laneory** (subtitle/store drafts în `docs/mobile/store-listing.md`).

Trademark clearance rămâne obligatorie înainte de submit.

„Mio” și „MiVue” se folosesc numai factual, fără a sugera afiliere, aprobare sau caracter oficial.

Vezi `docs/legal/trademark-usage.md`.
