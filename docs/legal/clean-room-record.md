> **MATERIAL PREGĂTITOR — NU CONSTITUIE CONSULTANȚĂ JURIDICĂ. Necesită revizuire de avocat RO/UE specializat în software și proprietate intelectuală înainte de orice folosire comercială.**

# Jurnal clean-room și proveniență

**Versiune:** 0.1  
**Data:** 19 iulie 2026  
**Statut:** draft de proces; nu dovedește că un clean-room istoric a existat

## 1. Declarație de stare

Repository-ul conține în același spațiu cod propriu, observații live și note provenite din analiză statică APK. Unele fișiere au fost scrise de persoane care ar fi putut avea acces la toate aceste categorii. În lipsa jurnalelor contemporane și a unei separări între echipa de analiză și echipa de implementare, proiectul nu trebuie descris public sau contractual drept „dezvoltat clean-room”.

Acest document definește o evidență pentru etapele viitoare și o carantină minimă. Avocatul va decide dacă procesul poate remedia situația sau dacă este necesară o rescriere de către implementatori neexpuși.

## 2. Categorii de surse

| Cod | Categorie | Acces permis implementatorilor mobili |
|---|---|---|
| `OWN` | cod/documentație originală cu titlu confirmat | da, după verificarea lanțului de titlu |
| `BBX` | observație black-box read-only pe dispozitiv deținut/controlat | numai prin specificația factuală aprobată de avocat |
| `PUB` | standard/documentație publică licențiată corespunzător | da, cu citare și respectarea licenței |
| `APK` | analiză statică/decompilare APK/XAPK | nu; carantină până la decizie scrisă |
| `3P` | bibliotecă, hartă, codec, font sau alt terț | doar după aprobarea licenței și notice-urilor |
| `EXC` | mutații, UI/resurse de brand, firmware/chei | nu; exclus definitiv din produs |

## 3. Jurnal component-cu-component

| Componentă existentă | Clasificare | Decizie mobilă | Acțiune necesară |
|---|---|---|---|
| `src/protocol/parser.ts` | `OWN` + date de test cu proveniență de verificat | candidat la portare | confirmați autorii; recreați corpusul din răspunsuri BBX redactate; review de securitate |
| `src/protocol/nmea.ts` | `OWN` + standard NMEA | candidat cu modificări | eliminați „MiVue 866 CLI” și namespace-ul cu marcă; confirmați sursa eșantioanelor |
| `src/discovery/discoverCamera.ts` | `OWN` + `BBX` | rescriere a adaptorului nativ | păstrați doar specificația de comportament; nu copiați API-urile Node |
| `src/transport/downloadTransport.ts` | `OWN` + `BBX` | portare de pattern, nu cod Node direct | transport/storage nativ; User-Agent propriu; teste fault-injection |
| `src/web/pathSafety.ts` | `OWN`, dar include logică folosită la delete | rescriere a politicii read-only | excludeți `assertRemoteSdPath` dedicat delete și orice comentariu/flux mutabil |
| `docs/protocol.md`, secțiuni confirmate live | `BBX`/`OWN` | specificație candidată | extrageți într-un document nou numai după review juridic și trasabilitate |
| `docs/protocol.md`, „Comenzi observate în APK” | `APK`/`EXC` | carantină | nu se furnizează echipei mobile; nu se copiază în issue-uri sau ADR-uri |
| `src/protocol/cameraMutate.ts` | `OWN` + posibil `APK` + `EXC` | exclus integral | nu se importă, nu se copiază, nu se reimplementează |
| `src/commands/probe.ts` | `OWN` + `APK` + `EXC` | exclus integral | aceeași restricție ca mai sus |
| `web/index.html`, `web/app.js`, `web/styles.css` | expresie UI existentă | rescriere originală | research UX independent; fără pixel matching, copy sau structură identică |
| User-Agent și metadate GPX cu „MiVue” | brand terț | înlocuire | identificator `[NUMELE_APLICAȚIEI]` și namespace propriu controlat de titular |
| Leaflet 1.9.4 | `3P`, BSD-2-Clause | doar referință curentă | păstrați notice-ul dacă este inclus; aplicația mobilă decide separat stack-ul de hărți |
| APK/XAPK, Androguard DB, firmware, imagini/icoane MiTAC | `APK`/`EXC` | excluse | nu se copiază în `mobile/`, build, test fixtures, demo sau distribuție |

## 4. Proces propus pentru o rescriere controlată

### Rol A — analiză și specificație

- inventariază numai observații necesare MVP-ului;
- marchează fiecare afirmație `BBX`, `PUB` sau `APK`;
- atașează dovada factuală, data, dispozitivul și metoda;
- nu include cod, pseudocod, denumiri interne, capturi UI sau resurse;
- predă avocatului specificația și matricea necesității.

### Rol B — control juridic

- aprobă, respinge sau condiționează fiecare cerință de protocol;
- decide cine poate face parte din echipa de implementare;
- stabilește retenția/carantina pentru artefacte și loguri;
- emite o versiune a specificației cu hash și listă de surse permise.

### Rol C — implementare independentă

- primește doar specificația aprobată și sursele publice permise;
- declară în scris expunerile anterioare;
- proiectează API-urile, naming-ul, UI-ul și testele independent;
- înregistrează commiturile, autorii, sursele consultate și deciziile;
- nu accesează directoarele/artefactele în carantină.

Dacă aceeași persoană îndeplinește rolurile A și C, avocatul trebuie să decidă explicit dacă termenul „clean-room” mai este corect și ce rescriere suplimentară este necesară.

## 5. Registru de livrări către implementatori

| ID | Document/hash | Clasificări incluse | Aprobat de avocat | Primit de | Data | Observații |
|---|---|---|---|---|---|---|
| `[TBD]` | `[TBD]` | `[BBX/PUB]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |

## 6. Declarație de expunere a implementatorului

Pentru fiecare contributor mobil:

| Contributor | A văzut APK/decompilări? | A văzut `cameraMutate.ts`/`probe.ts`? | A văzut UI MiVue Pro? | Decizie avocat | Data/semnătură |
|---|---:|---:|---:|---|---|
| `[TBD]` | `[DA/NU]` | `[DA/NU]` | `[DA/NU]` | `[TBD]` | `[TBD]` |

## 7. Reguli de carantină

- `.analysis/`, `.agents/`, `.cursor/`, `androguard.db` și `MiVue+Pro_*.xapk` rămân ignorate și nu sunt copiate în viitorul `mobile/`.
- Nu se postează fragmente sau capturi în issue trackers, chat-uri, documente de design sau prompturi pentru generare de cod.
- Orice fixture mobil provine din capturi BBX aprobate și redactate ori este sintetică.
- Nicio informație `APK` nu poate fi reclasificată prin simpla confirmare ulterioară; avocatul decide dacă și cum o observație independentă elimină contaminarea.
- Încălcarea carantinei oprește lucrul pe componentă și declanșează review juridic.

## 8. Gate

**Stare:** `NEAPROBAT CA PROCES CLEAN-ROOM`.

Procesul devine utilizabil numai după ce avocatul aprobă rolurile, specificația inițială, persoanele eligibile, regulile de retenție și modul de tratare a expunerilor istorice.
