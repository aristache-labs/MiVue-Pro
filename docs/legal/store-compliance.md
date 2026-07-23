> **MATERIAL PREGĂTITOR — NU CONSTITUIE CONSULTANȚĂ JURIDICĂ. Necesită revizuire de avocat RO/UE specializat în software și proprietate intelectuală înainte de orice folosire comercială.**

# Apple App Store și Google Play — draft de conformitate

**Versiune reguli verificată:** 19 iulie 2026  
**Produs:** `Laneory`  
**Stare:** plan; nu reprezintă declarații completate sau aprobarea magazinelor

Regulile magazinelor se schimbă. Toate linkurile și formularele trebuie reverificate imediat înaintea fiecărui submit.

## 1. Profilul propus al aplicației

- utilitar local-first pentru o cameră deținută/controlată de utilizator;
- conectare directă la IP-ul local al camerei;
- listare, download și, când e confirmat pe model/firmware, setări și operații pe fișiere pornite de utilizator (sau automatizări activate explicit);
- fără cont, cloud, analytics, ads sau crash reporting implicit;
- fără update firmware neautorizat și fără ocolirea controalelor de acces;
- Demo Mode complet pentru review fără cameră fizică;
- nume propriu și folosire descriptivă limitată a mărcilor terțe.

Orice abatere schimbă evaluarea App Privacy/Data Safety și necesită actualizarea acestui document.

## 2. Apple App Store

### 2.1 App completeness și review fără hardware

[App Review Guidelines, secțiunea 2.1](https://developer.apple.com/app-store/review/guidelines/) cere o versiune finală și informațiile necesare review-ului. Apple indică furnizarea unui cont demo sau a unui demo mode complet și, când funcțiile cer un mediu greu de reprodus ori hardware specific, instrucțiuni, video sau hardware.

Plan minim:

- Demo Mode integrat, accesibil reviewer-ului fără cont și fără rețea specială;
- același flux principal de listare, detalii, progres download și hartă, alimentat exclusiv cu date sintetice;
- etichetă persistentă „Demo Mode”; nicio afirmație că o cameră reală a fost găsită;
- review notes cu pași exacți, limitări, modelul testat și explicația rețelei locale;
- video de review care arată conexiunea cu hardware-ul real, cu SSID, coordonate și conținut personal redactate;
- date de contact active; hardware disponibil dacă Apple îl solicită;
- fără placeholder-e în binar sau metadata la submit.

### 2.2 Mărci și conținut terț

[Ghidul Apple pentru App Review](https://developer.apple.com/app-store/review/) avertizează că aplicațiile cu mărci/conținut terț ori funcții de stream/download pot necesita dovada autorizării. Pachetul de review trebuie să explice că utilizatorul descarcă fișiere de pe propriul dispozitiv și să includă opinia juridică, autorizarea disponibilă ori argumentația aprobată de avocat. Nu se promit aprobări pe care proiectul nu le deține.

### 2.3 Rețea locală și securitatea transportului

- includeți `NSLocalNetworkUsageDescription` cu o explicație specifică; Apple precizează că este necesară și pentru conexiuni unicast directe la hosturi locale: [documentație Apple](https://developer.apple.com/documentation/bundleresources/information-property-list/nslocalnetworkusagedescription);
- solicitați accesul numai când utilizatorul pornește conectarea; dacă starea este nedeterminată în background, operația poate fi refuzată fără prompt;
- definiți excepția minimă necesară pentru HTTP local și documentați de ce camera nu oferă HTTPS; nu permiteți cleartext către internet;
- nu transmiteți parola Wi‑Fi, SSID-ul, IP-ul, lista de fișiere sau media către serverele dezvoltatorului;
- explicați clar riscul rețelei locale neautentificate și verificați că endpoint-ul răspunde cu forma așteptată înainte de download.

Referință: [TN3179 — Understanding local network privacy](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy).

### 2.4 Transferuri în fundal

[Documentația Apple pentru background downloads](https://developer.apple.com/documentation/foundation/downloading-files-in-the-background) permite sesiuni de download HTTP/HTTPS în afara procesului, dar impune delegate, scheduling controlat de sistem și limitări. Înainte de a declara funcția:

- prototipați HTTP/1.0 și hostul local pe dispozitive/versiuni suportate;
- testați suspendare, terminare de sistem, force-quit, pierdere Wi‑Fi și schimbare de rețea;
- nu promiteți resume, deoarece serverul camerei nu are suport `Range` confirmat;
- nu porniți lanțuri nelimitate în background; raportați starea reală utilizatorului.

### 2.5 Privacy

- Apple cere URL de privacy policy pentru toate aplicațiile și răspunsuri App Privacy exacte, inclusiv pentru SDK-uri terțe: [App Store Connect — App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/);
- „collect” în formularul Apple privește, în principal, transmiterea off-device accesibilă dezvoltatorului/partenerilor peste timpul necesar requestului: [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/);
- local-only poate permite răspunsul „Data Not Collected” numai dacă build-ul și toate SDK-urile chiar nu transmit date; decizia se ia din analiza traficului build-ului final, nu din intenție;
- privacy policy rămâne obligatorie și trebuie accesibilă în aplicație;
- dacă se adaugă hărți online, analytics, crash reporting, support upload sau cloud, se reevaluează eticheta înainte de release.

## 3. Google Play

### 3.1 App access și Demo Mode

- în Play Console declarați corect dacă funcționalitatea este restricționată de hardware/rețea;
- furnizați instrucțiuni de acces și Demo Mode fără credențiale de producție;
- păstrați un video de review pentru funcția reală și un contact care poate răspunde;
- Demo Mode nu trebuie să ascundă funcții suplimentare ori să mimeze conectarea reală în build-ul de producție.

[Google Play — Declare permissions for your app](https://support.google.com/googleplay/android-developer/answer/9214102?hl=en) descrie informațiile de acces și folosirea exclusivă a credențialelor de test, când acestea există.

### 3.2 Data Safety și privacy policy

- toate aplicațiile publicate trebuie să completeze formularul Data Safety; chiar și o aplicație fără colectare trebuie să completeze formularul și să furnizeze privacy policy: [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en);
- declarația acoperă și SDK-urile terțe și trebuie să corespundă comportamentului tuturor variantelor active;
- procesarea locală trebuie separată de transmiterea către dezvoltator/terți; testați traficul build-ului final;
- privacy policy trebuie legată în Play Console și disponibilă în aplicație: [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-GB);
- nu bifați anticipat „no data collected”; completați numai după inventarul SDK, analiza rețelei și aprobarea responsabilului privacy.

### 3.3 Permisiuni minime

- nu cereți locația telefonului pentru GPS-ul citit din fișierul camerei;
- dacă API-urile de gestionare Wi‑Fi o cer pe Android 13+, folosiți `NEARBY_WIFI_DEVICES` și `neverForLocation` numai dacă afirmația este adevărată: [Android Wi‑Fi permissions](https://developer.android.com/develop/connectivity/wifi/wifi-permissions);
- pentru target Android 17/API 37+, accesul la rețeaua locală este blocat implicit și se folosește `ACCESS_LOCAL_NETWORK` ori un picker privacy-preserving aplicabil: [Android local network permission](https://developer.android.com/privacy-and-security/local-network-permission);
- nu cereți `MANAGE_EXTERNAL_STORAGE`; folosiți storage privat și system picker/share sheet pentru export;
- solicitați fiecare permisiune contextual, după o explicație clară, și oferiți comportament util când este refuzată;
- eliminați permisiunile tranzitive nefolosite din manifestul final.

### 3.4 Transferuri user-visible

Pentru transferurile care trebuie să continue când aplicația nu este vizibilă:

- documentați de ce operația nu poate fi amânată sau întreruptă fără impact;
- utilizatorul pornește, vede și poate opri transferul;
- folosiți tipul de foreground service/alternativa recomandată pentru target SDK-ul final;
- completați declarația Play Console și video-ul cerut dacă build-ul folosește foreground services;
- nu porniți servicii la boot și nu transformați downloadul punctual în sincronizare continuă.

Referință: [Google Play — foreground service requirements](https://support.google.com/googleplay/android-developer/answer/13392821?hl=en).

## 4. Matrice de declarații — necompletată

| Declarație | Apple | Google | Dovadă necesară | Stare |
|---|---|---|---|---|
| privacy policy publică și în-app | obligatorie | obligatorie | URL final + capturi build | `[TBD]` |
| date colectate | App Privacy | Data Safety | SBOM + captură trafic + data-flow | `[TBD — nu declarați încă]` |
| SDK-uri terțe | incluse în răspunsuri | incluse în răspunsuri | inventar versiuni/practici | `[TBD]` |
| rețea locală | usage description | permisiune după target/API | manifest + UX prompt | `[TBD]` |
| background transfer | entitlement/mode/API justificat | FGS/WorkManager și declarație, dacă se aplică | teste + video | `[TBD]` |
| acces fără hardware | Demo Mode/review notes | App access/Demo Mode | date sintetice + pași | `[TBD]` |
| drepturi marcă/conținut | dovadă dacă este cerută | metadata și policy compliance | opinie/autorizație | `[TBD]` |
| age rating/content | chestionar final | content rating | funcții și demo media finale | `[TBD]` |

## 5. Gate de submit

Nu se creează listing și nu se trimite build până când:

- Demo Mode este complet și verificat fără hardware;
- toate permisiunile sunt minime și justificate;
- privacy policy, App Privacy și Data Safety corespund build-ului final;
- documentele de marcă/IP și dreptul de a facilita downloadul sunt aprobate;
- toate URL-urile, screenshot-urile, textele și declarațiile sunt finale;
- regulile Apple/Google au fost reverificate în săptămâna submitului.
