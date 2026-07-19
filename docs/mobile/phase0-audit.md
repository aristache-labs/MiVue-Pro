# Faza 0 — audit tehnic și juridic

**Data auditului:** 19 iulie 2026  
**Statut:** raport pregătitor; nu aprobă lansarea și nu înlocuiește consultanța juridică

## 1. Scop și limite

Acest raport inventariază materialele existente care ar putea informa o aplicație mobilă read-only, delimitează materialele excluse și consemnează riscurile care trebuie soluționate înainte de implementare sau comercializare.

În această fază:

- nu se modifică surse, teste, UI sau configurări de runtime;
- nu se creează `mobile/` și nu se alege framework-ul;
- nu se publică și nu se pregătește un submit Apple/Google;
- numele produsului rămâne `[NUMELE_APLICAȚIEI]`;
- constatările privind drepturile sunt întrebări și gate-uri pentru avocat, nu opinii juridice.

## 2. Baza factuală verificată

Auditul a folosit sursele existente în repository la data de mai sus:

- codul TypeScript din `src/`;
- `docs/protocol.md`, `docs/research-notes.md` și `docs/security-and-legal.md`;
- manifestele npm și licența Leaflet instalată local;
- documentația oficială UE, Apple și Google indicată în drafturile juridice.

Proveniența și titlul asupra codului descris ca „original” trebuie confirmate separat prin istoricul Git, contracte de muncă/cesiune și declarațiile contributorilor. Repository-ul este marcat `private` și nu are la rădăcină o licență proprie; aceasta nu împiedică reutilizarea internă de către titular, dar nu dovedește cine este titularul.

## 3. Confirmări deja existente

`.gitignore` exclude deja:

- `.analysis/`;
- `.agents/`;
- `.cursor/`;
- `androguard.db`;
- `MiVue+Pro_*.xapk`.

Aceste artefacte sunt neversionate în starea verificată. Cerința va trebui replicată în `mobile/.gitignore` abia când se creează scaffolding-ul, în Faza 2.

## 4. Inventar reutilizabil

„Reutilizabil” în tabel înseamnă candidat tehnic, condiționat de confirmarea titularului drepturilor și de curățarea elementelor de brand. Nu este o aprobare juridică.

| Componentă | Ce poate fi păstrat | Portabilitate mobilă | Condiții înainte de portare |
|---|---|---|---|
| `src/protocol/parser.ts` | parsarea răspunsurilor `Config.cgi` și a listelor XML `<DCIM>`/categorii | ridicată; nu importă API-uri Node | teste cu corpus propriu; limite de mărime; validare XML defensivă; confirmarea provenienței exemplelor |
| `src/protocol/nmea.ts` | parsare NMEA, checksum, conversie coordonate și structură GPX | ridicată; nu importă API-uri Node | schimbați `creator="MiVue 866 CLI"` și namespace-ul `.../mivue`; validați datele calendaristice și limitele geografice |
| `src/discovery/discoverCamera.ts` | strategia de candidați și verificarea read-only a statusului | logica este portabilă, implementarea nu | înlocuiți `node:os`, `node:perf_hooks` și transportul Node cu API-uri native; cereți permisiunile de rețea locală la momentul potrivit |
| `src/transport/downloadTransport.ts` | modelul `.part` → validare dimensiune → redenumire, fără suprascriere | pattern portabil; codul folosește `node:fs`, `node:net`, `Buffer` | transport și storage native; operație atomică unde platforma o permite; identificator propriu de client; testare la întrerupere și spațiu insuficient |
| `src/web/pathSafety.ts` | principiile allowlist `/SD/`, respingere `..`/CRLF, izolare în directorul ales | pattern relevant; codul local folosește `node:path` | nu se portează funcția/comentariul dedicat delete; se definesc separat politici pentru video, foto și NMEA; se testează Unicode și link-uri simbolice unde există |
| `docs/protocol.md` | observațiile proprii, confirmate live, strict necesare interoperabilității read-only | sursă de specificație, nu cod | separați afirmațiile black-box de cele provenite din APK; avocatul aprobă setul de informații înainte de a fi dat echipei mobile |

## 5. Elemente excluse sau care cer rescriere

| Element | Decizie Faza 0 | Motiv |
|---|---|---|
| `src/protocol/cameraMutate.ts` | exclus integral din `mobile/` | conține `set` și `del`; produsul mobil trebuie să fie strict read-only |
| `src/commands/probe.ts` | exclus integral | orchestrează probe `get`/`set`/`del` și include cunoaștere experimentală care nu este necesară produsului read-only |
| secțiunea „Comenzi observate în APK” din `docs/protocol.md` | carantină juridică | provine din analiză statică APK și include operații mutabile; nu intră în specificația mobilă fără decizie scrisă a avocatului |
| `web/index.html`, `web/app.js`, `web/styles.css` | nu se portează și nu se clonează vizual | UI-ul mobil trebuie să aibă design și expresie originale |
| `MiVuePro-Research/1.0` din User-Agent | se înlocuiește | evitarea confuziei de brand și a unei identități de cercetare în produs |
| `MiVue 866 CLI` și namespace-ul `.../mivue` din GPX | se înlocuiesc | eliminarea brandului din metadatele generate de produs |
| APK/XAPK, rezultate Androguard, firmware, chei, resurse grafice ale producătorului | excluse definitiv din distribuție | nu sunt active proprii și nu sunt necesare runtime-ului mobil |

## 6. Riscuri tehnice preliminare

| Risc | Stare a dovezii | Regula provizorie |
|---|---|---|
| server embedded vechi și concurență posibil limitată | ipoteză prudentă; limita exactă nu este documentată în repository | coadă cu un singur transfer activ până la testare controlată pe fiecare familie/firmware |
| HTTP/1.0 necesar pe dispozitivul testat | confirmat în `docs/protocol.md` și implementarea curentă | transportul mobil trebuie să permită comportamentul confirmat; nu se presupune compatibilitate HTTP/1.1 |
| suport `Range`/resume | neconfirmat | nu se afișează și nu se promite resume; un transfer întrerupt reîncepe, păstrând sau curățând controlat fișierul parțial |
| transferuri în fundal pe iOS | API-urile Apple au constrângeri de scheduling și doar HTTP/HTTPS pentru sesiuni background | prototip pe dispozitiv real; aplicația nu promite continuitate nelimitată și tratează suspendarea/terminarea explicit |
| transferuri lungi pe Android | necesită o soluție user-visible conform versiunii țintă și politicii Play | evaluați foreground service/WorkManager în ADR; operația trebuie pornită și oprită de utilizator |
| permisiuni rețea locală | iOS cere descriere și consimțire; Android 17 blochează implicit pentru aplicații target SDK 37+ | solicitați minimum necesar, contextual; revalidați API-urile și target SDK la release |
| RTSP/live-view | indisponibil pe firmware-ul testat; rutele cunoscute răspund 404 | în afara MVP și a afirmațiilor de compatibilitate; nu se activează prin comenzi mutabile |
| date media foarte mari și spațiu insuficient | risc inerent, netestat mobil | verificare spațiu, anulare, cleanup sigur și niciodată suprascriere implicită |
| căi și nume furnizate de cameră | intrare neîncrezătoare | allowlist, nume generate local, limite de lungime/mărime și protecție anti path-traversal |

## 7. Riscuri juridice preliminare

1. **Observații de protocol cu proveniență mixtă.** O parte este confirmată direct pe o cameră controlată de utilizator; o parte este documentată ca provenind din analiză statică APK. Condițiile articolelor 5 și 6 din Directiva 2009/24/CE trebuie analizate pe fapte, inclusiv dreptul de folosire a copiei, necesitatea, disponibilitatea prealabilă și limitarea la interoperabilitate. Articolul 8 păstrează aplicabile dreptul contractual, mărcile, concurența neloială și secretele comerciale.
2. **C-406/10 nu este un safe harbour general.** Hotărârea distinge funcționalitatea/ideile de expresia protejată, dar nu autorizează copierea codului, manualelor, resurselor sau a unei expresii substanțial similare.
3. **Marcă și prezentare comercială.** „Mio” și „MiVue” pot fi folosite numai factual și în practici comerciale oneste, dacă este necesar pentru a identifica destinația/compatibilitatea; trebuie evitate impresia de afiliere, numele de produs bazat pe marcă, logo-urile și stilul vizual al titularului.
4. **Lipsa autorizării MiTAC.** Nu există în repository o autorizare scrisă pentru brand, resurse, protocol sau afirmații de compatibilitate extinsă.
5. **EULA și proveniența APK neverificate.** Nu este arhivat textul EULA aplicabil versiunii analizate și artefactul este documentat ca provenind dintr-un pachet XAPK terț. Această zonă este blocată până la analiza avocatului.
6. **Date personale.** Clipurile, sunetul, plăcuțele, fețele, GPS-ul și traseele pot fi date personale. Procesarea locală reduce expunerea, dar nu elimină obligațiile aplicabile utilizatorului/operatorului și nici cerințele de transparență ale magazinelor.
7. **Codecuri și hărți.** O eventuală integrare FFmpeg/codecuri sau hărți online adaugă licențe, posibile probleme de brevete, termeni pentru tile-uri și transferuri de date către terți.

Referințele și întrebările pentru avocat sunt detaliate în `docs/legal/ip-review.md`.

## 8. Blocaje care cer avocat sau decizie umană

### Gate-uri juridice obligatorii

- opinie scrisă RO/UE asupra folosirii observațiilor black-box și a fiecărei informații APK-derived;
- verificarea EULA/termenilor valabili la data și pentru sursa copiei analizate;
- confirmarea lanțului de titlu asupra codului propriu și a dreptului de relicențiere/distribuire;
- decizie dacă procesul existent poate fi numit „clean-room”; în prezent, nu poate fi demonstrată o separare completă a rolurilor;
- căutare și opinie de marcă pentru numele final, icon, subtitle, keywords și disclaimer;
- încercare documentată de clarificare/autorizare cu MiTAC, fără a trata lipsa răspunsului drept acord;
- aprobarea textelor privacy/terms și a rolurilor GDPR înainte de colectare, telemetrie, hărți online sau cloud.

### Decizii de produs obligatorii

- lista exactă de modele/firmware suportate și nivelul de încredere al fiecărei afirmații;
- dacă aplicația rămâne complet locală și fără cont/analytics/crash reporting;
- politica de stocare, export, backup și ștergere a media/GPS;
- scenariul Demo Mode și activele sintetice folosite la review;
- dacă transferurile în fundal intră în MVP după prototipurile native.

## 9. Criteriul de ieșire din Faza 0

Faza 0 este documentată când cele opt livrabile sunt revizuite intern. Trecerea la Faza 1 permite doar ADR-ul de framework, arhitectura, threat model-ul STRIDE, diagrama de date și planul Demo Mode. Nu autorizează portarea informațiilor aflate în carantină și nu autorizează lansarea.

## 10. Următorul pas propus

Faza 1 va compara React Native bare, Flutter și Kotlin Multiplatform; va defini modulele viitoare din `mobile/`, modelul STRIDE, fluxul de date și un Demo Mode fără hardware. Alegerea și implementarea sunt în afara acestui raport.
