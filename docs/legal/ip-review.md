> **MATERIAL PREGĂTITOR — NU CONSTITUIE CONSULTANȚĂ JURIDICĂ. Necesită revizuire de avocat RO/UE specializat în software și proprietate intelectuală înainte de orice folosire comercială.**

# Revizuire proprietate intelectuală și interoperabilitate

**Versiune:** 0.1  
**Data:** 19 iulie 2026  
**Produs:** `Laneory`

## 1. Scopul revizuirii

Documentul identifică informațiile de protocol propuse pentru o aplicație mobilă independentă (read și mutații pe cameră deținută legal) și separă sursele observate direct de cele provenite din analiză statică. Nu concluzionează că o excepție legală se aplică și nu autorizează utilizarea vreunei informații.

## 2. Obiectivul de interoperabilitate

Obiectivul minim propus este ca o aplicație creată independent să poată, la cererea proprietarului camerei:

1. detecta o cameră în rețeaua locală;
2. citi statusul și metadatele;
3. lista fișierele media;
4. descărca un fișier;
5. citi un sidecar NMEA și exporta un GPX local.

Obiectivul extins (când modelul/firmware-ul confirmă suportul) include setări `set` validate, gestionarea fișierelor pe card (inclusiv ștergere) și formatarea SD, prin infrastructura centralizată de mutații. Rămân în afara scopului: update firmware neautorizat, ocolirea autentificării, BLE proprietar nevalidat, clonarea UI sau redistribuirea aplicației producătorului.

## 3. Surse și proveniență

### 3.1 Observații black-box pe echipament controlat

Repository-ul afirmă că testele au fost efectuate pe o cameră MiVue 866 controlată de utilizator și că următoarele comportamente au fost confirmate prin cereri de tip `get` / list / download:

- adresă locală și porturi observate;
- răspuns de status `Config.cgi`;
- listarea categoriilor și forma XML;
- acces `HEAD`/`GET`, `Content-Length` și HTTP/1.0;
- sidecar NMEA și transformarea datelor;
- indisponibilitatea RTSP pe firmware-ul testat.

De verificat probator: factură/proprietate, data testelor, versiunea firmware, capturi brute cu date personale redactate, persoanele care au executat testele și condițiile contractuale aplicabile.

### 3.2 Analiză statică APK/XAPK — sursă separată

`docs/research-notes.md` consemnează analiza statică a pachetului `com.mitac.mitubepro`, versiunea `1.1.220.1`, cu un hash SHA-256, iar numele artefactului ignorat indică o distribuție XAPK terță. Nu există în repository:

- dovada sursei autorizate/licenței copiei;
- EULA acceptată pentru acea versiune;
- o autorizare MiTAC;
- dovada că informația nu era ușor disponibilă din documentație publică sau observații black-box;
- un jurnal contemporan care limitează fiecare act la ce era indispensabil interoperabilității.

Orice endpoint, rută, proprietate, constantă sau structură provenită exclusiv din această analiză rămâne în carantină până la opinia scrisă a avocatului.

### 3.3 Cod propriu din repository

Fișierele indicate ca originale sunt candidați la reutilizare internă, însă această clasificare trebuie susținută prin istoricul Git și documente privind autorii/titularii. Absența unei licențe proprii la rădăcina repository-ului nu dovedește titlul.

## 4. Matricea informațiilor de protocol

| Informație | Sursă documentată | Necesară MVP | Stare propusă |
|---|---|---:|---|
| status `get&property=status` și forma răspunsului | observație live + cod propriu | da | eligibilă pentru review juridic |
| listare `dir`, categorii, paginare și XML | observație live + cod propriu | da | eligibilă pentru review juridic |
| acces fișier prin calea listată, `HEAD`/`GET`, HTTP/1.0 | observație live | da | eligibilă pentru review juridic |
| format NMEA standard și asocierea sidecar | fișier de pe dispozitiv + standarde cunoscute | da | eligibilă pentru review juridic |
| proprietăți `get` din `cameraMutate.ts` | proveniență mixtă/neclară | pe necesitate | carantină până la trasabilitate; nu se importă fișierul brut în mobil |
| `action=set`, `action=del` confirmate pe cameră | APK + probe live | pe necesitate | eligibile după `camera-confirmed` + strat centralizat de mutații; APK-only rămâne carantină |
| rute RTSP `av4`–`av7` | documentate ca APK-derived | nu | carantină și în afara afirmațiilor de compatibilitate |
| BLE, codecuri/player-e interne APK | analiză statică | nu | excluse |
| cod, UI, texte, icoane sau resurse MiTAC | programul original | nu | interdicție de copiere/distribuire fără permisiune |

## 5. Cadrul UE care trebuie analizat de avocat

### Directiva 2009/24/CE

- [Articolul 1](https://eur-lex.europa.eu/eli/dir/2009/24/oj/eng) distinge expresia protejată de ideile și principiile care stau la baza elementelor și interfețelor unui program.
- Articolul 5 include, în condițiile sale, actele necesare utilizării de către dobânditorul legal și dreptul persoanei îndreptățite să observe, studieze sau testeze funcționarea în cursul unor acte pe care are dreptul să le efectueze.
- Articolul 6 permite decompilarea numai când este indispensabilă interoperabilității unui program creat independent și numai dacă sunt îndeplinite cumulativ condițiile privind persoana îndreptățită, disponibilitatea informației și limitarea la părțile necesare. Informația obținută are limitări explicite de scop, divulgare și expresie similară.
- Articolul 8 menține aplicabile, între altele, dreptul contractelor, mărcile, concurența neloială și secretele comerciale. Prin urmare, analiza copyright nu epuizează riscurile.

Text oficial: [Directiva 2009/24/CE, EUR-Lex](https://eur-lex.europa.eu/eli/dir/2009/24/oj/eng).

### C-406/10, SAS Institute

[Hotărârea CJUE din 2 mai 2012, C-406/10](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:62010CJ0406) stabilește, în esență, că funcționalitatea, limbajul de programare și formatul fișierelor de date utilizate pentru anumite funcții nu sunt, ca atare, forme de exprimare protejate prin copyright-ul programului; totuși, reproducerea expresiei intelectuale din cod sau manual poate încălca drepturile. Faptele acestui proiect trebuie comparate de avocat cu hotărârea; titlul cauzei nu este o autorizare generală pentru reverse engineering.

## 6. Condiții de minimizare propuse

- porniți de la documentație publică și testare black-box pe dispozitiv deținut;
- consemnați de ce fiecare informație este necesară și de ce nu era readily available;
- nu copiați cod, pseudocod, naming intern, structură UI, texte, imagini sau resurse;
- nu distribuiți APK/XAPK, decompilări, capturi sau fragmente;
- furnizați implementatorilor doar o specificație aprobată, factuală, fără artefacte MiTAC;
- limitați aplicația la dispozitive deținute/controlate de utilizator și la acțiuni pornite de acesta (sau automatizări activate explicit);
- mutațiile trec prin validare de capabilitate; nu folosiți tehnici de ocolire a măsurilor tehnice;
- păstrați probe datate privind independența implementării și sursele folosite.

Aceste măsuri reduc riscul, dar nu dovedesc singure conformitatea.

## 7. Întrebări obligatorii pentru avocat

1. Persoana care a analizat APK-ul avea dreptul să folosească acea copie și care EULA/termeni se aplicau?
2. Ce acte tehnice au constituit observare/testare versus decompilare/reproducere/traducere a codului?
3. Era fiecare informație APK-derived indispensabilă și indisponibilă prin black-box sau surse publice?
4. Putem elimina complet informațiile APK-derived și obține funcția MVP doar din testare black-box pe cameră?
5. Ce limite impun dreptul român, contractul, secretele comerciale, concurența neloială și eventualele măsuri tehnice?
6. Ce documente trebuie păstrate și ce materiale trebuie șterse ori puse sub legal hold?
7. Ce afirmații de compatibilitate și ce utilizare a mărcilor sunt permise în aplicație și store listing?
8. Este necesară sau recomandată autorizarea MiTAC pentru review-ul Apple, distribuție sau conținutul descărcat de utilizator?

## 8. Decizie și semnături

**Stare curentă:** `BLOCAT PENTRU UTILIZARE COMERCIALĂ` până la răspunsurile de mai sus.

| Rol | Nume | Decizie | Dată | Referință opinie |
|---|---|---|---|---|
| avocat IP/software RO/UE | `[TBD]` | `[APROBAT / APROBAT CU CONDIȚII / RESPINS]` | `[TBD]` | `[TBD]` |
| titular produs | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |

Tăcerea unui titular de drepturi sau lipsa răspunsului la o solicitare nu se consemnează drept acord.
