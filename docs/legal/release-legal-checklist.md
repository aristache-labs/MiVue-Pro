> **MATERIAL PREGĂTITOR — NU CONSTITUIE CONSULTANȚĂ JURIDICĂ. Necesită revizuire de avocat RO/UE specializat în software și proprietate intelectuală înainte de orice folosire comercială.**

# Gate juridic și de conformitate pentru release

**Produs:** `Laneory`  
**Release:** `[VERSIUNE / BUILD]`  
**Data țintă:** `[TBD]`  
**Stare inițială:** `BLOCAT`

Niciun checkbox nu poate fi bifat doar pe baza intenției, a unui review anterior sau a aprobării magazinului. Fiecare element cere o dovadă aferentă build-ului și teritoriilor release-ului. Aprobarea Apple/Google nu este o opinie juridică.

## 1. Gate-uri hard — toate obligatorii

### Drepturi și interoperabilitate

- [ ] Avocat RO/UE specializat în software/IP a emis opinie scrisă pentru observațiile black-box, analiza statică și aplicarea Directivei 2009/24/CE/C-406/10.
- [ ] Fiecare informație de protocol din build este în matricea aprobată, cu sursă, necesitate și dovadă.
- [ ] Nicio informație aflată în carantină APK nu a intrat în specificație, cod, teste, UI, issue-uri sau materiale promoționale.
- [ ] EULA/termenii aplicabili camerei și aplicației MiVue Pro, pentru versiunea/sursa relevantă, au fost obținuți și analizați.
- [ ] Proveniența copiei APK/XAPK și dreptul de folosire au fost analizate; orice remediere cerută este finalizată.
- [ ] Lanțul de titlu asupra codului, documentației, designului și activelor proprii este documentat prin contracte/cesiuni/declarații.
- [ ] Avocatul a decis dacă expresia „clean-room” poate fi folosită; dacă nu, nu apare în comunicări.
- [ ] `cameraMutate.ts`, `probe.ts`, `set`, `del`, format, firmware update/upload și activarea live-view sunt absente din produsul mobil.
- [ ] APK/XAPK, decompilări, firmware, chei și resurse MiTAC sunt absente din repository-ul mobil și pachetele distribuite.

### Mărci, marketing și relația cu MiTAC

- [ ] Numele final, iconul, domeniul, bundle/package ID, subtitle-ul și keywords au trademark clearance în teritoriile țintă.
- [ ] „Mio”/„MiVue” sunt folosite numai descriptiv, nedominant și în practici comerciale oneste, conform opiniei avocatului.
- [ ] Disclaimer-ul de neafiliere și traducerile sale sunt aprobate și vizibile unde este necesar.
- [ ] Fiecare model/firmware din lista de compatibilitate are test și dovadă datată; limitările sunt publicate.
- [ ] User-Agent, namespace GPX, texte și loguri folosesc identitatea proprie, nu `MiVuePro-Research` sau `MiVue 866 CLI`.
- [ ] A fost făcută o solicitare best-effort documentată către MiTAC pentru clarificare/autorizare; avocatul a aprobat destinatarul, conținutul și momentul solicitării.
- [ ] Lipsa răspunsului MiTAC nu este descrisă ca acord, aprobare sau tolerare.
- [ ] Nu există afirmații „oficial”, „aprobat”, „certificat”, „partener” ori compatibilitate garantată fără documente exprese.

### Licențe și active terțe

- [ ] SBOM-ul build-ului final este complet, cu versiuni exacte și dependențe tranzitive.
- [ ] Toate licențele și NOTICE-urile au fost verificate și incluse în aplicație/distribuție unde este necesar.
- [ ] Framework-ul mobil și modulele native au aprobări de licență.
- [ ] Harta, tile-urile, datele OpenStreetMap/alte date și attribution-ul au termeni aprobați pentru uz comercial și volum.
- [ ] Build-ul FFmpeg/configurația codecurilor, dacă există, are review LGPL/GPL, source/relinking și analiză brevete/royalty pe teritorii.
- [ ] Fonturile, iconurile, screenshot-urile, video-urile și fișierele Demo Mode sunt proprii, sintetice sau licențiate, cu release-uri necesare.
- [ ] Nu sunt copiate UI, texte, logo-uri, imagini ori trade dress din MiVue Pro.

### Privacy și protecția datelor

- [ ] Data-flow-ul build-ului final include toate SDK-urile, hosturile, logurile, backup-urile, exporturile și variantele.
- [ ] Analiza traficului pe iOS și Android confirmă declarațiile; nu există endpoint-uri/telemetrie neinventariate.
- [ ] Privacy policy finală identifică entitatea, aplicația, datele, scopurile, retenția, ștergerea, partajarea, drepturile și contactul.
- [ ] Privacy policy este publică, accesibilă în aplicație și legată corect în ambele console.
- [ ] App Privacy și Data Safety au fost completate de persoane autorizate și corespund exact build-ului și SDK-urilor.
- [ ] Permisiunile sunt minime, contextuale și explicate; refuzul nu produce dark patterns.
- [ ] Nu se solicită locația telefonului pentru a procesa GPS-ul din cameră.
- [ ] Stocarea, backup-ul, cache-ul, `.part`, thumbnails, exportul și ștergerea au politici implementate și testate.
- [ ] Logurile și support bundle-urile redactează coordonate, SSID, IP, căi, nume și conținut media.
- [ ] Hărțile online, analytics, crash reporting, cloud sau suport upload sunt dezactivate până la aprobarea separată; dacă există, consimțământul/baza legală și transferurile sunt aprobate.
- [ ] Au fost evaluate DPIA/LIA/DPA/SCC și obligațiile locale acolo unde funcțiile/teritoriile le cer.

### Store compliance

- [ ] Regulile Apple și Google au fost reverificate în ultimele 7 zile înainte de submit și schimbările sunt consemnate.
- [ ] Demo Mode funcționează complet fără cameră, cont sau credențiale și este etichetat ca demo.
- [ ] Review notes/App access includ pași exacți, contact, video și explicația hardware/rețea locală.
- [ ] Dacă magazinul cere dovada drepturilor pentru marcă, hardware sau download, pachetul aprobat de avocat este disponibil.
- [ ] Usage descriptions și manifestele declară numai accesul real (rețea locală, nearby Wi‑Fi, storage, foreground service).
- [ ] HTTP cleartext este limitat tehnic la camera/rețeaua locală; HTTPS rămâne obligatoriu pentru servicii externe.
- [ ] Background transfer a fost testat pe platformele suportate; UI-ul nu promite resume sau continuitate neconfirmată.
- [ ] Foreground service Android, dacă există, este user-initiated, vizibil, opribil și declarat conform target SDK/politicii curente.
- [ ] Metadata, age/content rating, screenshot-uri, privacy labels și descrierea funcției read-only sunt coerente.
- [ ] Nu există feature flags ascunse, endpoint-uri mutabile, placeholder-e, URL-uri nefuncționale sau funcții nedocumentate.

### Securitate și calitate probatorie

- [ ] Threat model-ul STRIDE și review-ul de securitate acoperă camera spoofing, path traversal, fișiere malițioase, cleartext local și DoS/spațiu.
- [ ] Downloadul nu suprascrie, validează dimensiunea, izolează `.part` și gestionează sigur anularea/lipsa spațiului.
- [ ] Testele pe dispozitive reale acoperă firmware-urile declarate, pierderea rețelei, schimbarea rețelei și răspunsuri corupte.
- [ ] Release artefacts, SBOM, hash-uri, rezultate teste, capturi de declarații și aprobări sunt arhivate imutabil.
- [ ] Planul de incident, contactul pentru vulnerabilități și mecanismul de retragere/update sunt aprobate.

## 2. Autorizații și decizii

| Domeniu | Responsabil | Decizie | Data | Dovadă/link intern | Expiră/review la |
|---|---|---|---|---|---|
| IP/interoperabilitate/EULA | avocat `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| marcă și marketing | avocat `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| privacy/data protection | DPO/privacy lead `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| licențe/SBOM | legal + engineering `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| securitate | security lead `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| produs și afirmații compatibilitate | product owner `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` |
| submit Apple | release owner `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | release-specific |
| submit Google | release owner `[TBD]` | `[TBD]` | `[TBD]` | `[TBD]` | release-specific |

## 3. Decizie finală

| Câmp | Valoare |
|---|---|
| build/hash | `[TBD]` |
| teritorii | `[TBD]` |
| canale | `[App Store / Google Play / TBD]` |
| excepții acceptate | `[NU / listă aprobată și semnată]` |
| decizie | `[GO / NO-GO]` |
| semnături | `[TBD]` |
| dată | `[TBD]` |

**Regulă:** orice gate hard nebifat, dovadă expirată, câmp relevant `[TBD]` sau diferență între build și declarații produce automat `NO-GO`. Documentul nu va spune niciodată că aplicația este „aprobată legal”; va consemna numai persoanele, aria și dovezile deciziei pentru release-ul specific.
