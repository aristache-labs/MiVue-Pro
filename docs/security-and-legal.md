# Securitate și utilizare legitimă

Proiectul este destinat interoperabilității cu un dispozitiv deținut și controlat de utilizator.

Dashboardul web ascultă exclusiv pe `127.0.0.1`. Coordonatele GPS sunt procesate și desenate local; nu sunt trimise către furnizori de hărți sau alte servicii externe.

**Produs mobil comercial:** operații read-only și mutative pe o cameră deținută sau administrată legitim de utilizator. Fiecare setare sau operație pe fișiere trebuie confirmată ca suportată de modelul și firmware-ul conectat, validată înainte de execuție și rutată prin infrastructura centralizată de mutații (echivalentul mobil al `cameraMutate`). Automatizările mutative rulează numai dacă utilizatorul le-a creat sau activat explicit. Documente pregătitoare: [docs/legal/](legal/), [docs/compatibility.md](compatibility.md), [docs/mobile/phase0-audit.md](mobile/phase0-audit.md). Materialele APK/XAPK rămân în carantină juridică până la clasificare `apk-observed` → validare pe cameră — vezi banner-ele din [protocol.md](protocol.md) și [research-notes.md](research-notes.md).

- Nu include și nu redistribuie APK/XAPK, firmware sau chei.
- Nu stochează parola Wi-Fi.
- Nu implementează update sau upload de firmware nevalidat / neautorizat.
- Dashboardul/CLI păstrează gate-ul `MIVUE_ALLOW_MUTATE=1`. Aplicația mobilă nu folosește această variabilă Node; ea aplică registrul de capabilități, verificări de model/firmware și confirmare (sau regulă de automatizare activată) pentru fiecare acțiune mutativă.
- Setările camerei pot include toate proprietățile `set` confirmate pe modelul/firmware-ul conectat (nu doar Frequency, EV, Date & Time, Time Zone, Daylight Saving Time). UI-ul afișează când e posibil valoarea curentă și cea propusă; aplicarea manuală necesită confirmare explicită, exceptând profilele/automatizările activate voluntar.
- Gestionarea fișierelor pe cameră poate include listare, preview, download, copiere, mutare, redenumire, protejare/deprotejare, schimbare categorie, ștergere (inclusiv bulk) și curățare pe reguli, când protocolul și camera confirmă suportul. Căile sunt revalidate imediat înainte de execuție; selecțiile bulk/destructive cer confirmare întărită sau o regulă explicit activată.
- Formatarea cardului SD este permisă dintr-un ecran dedicat (sau printr-o regulă de automatizare creată explicit), când camera este conectată și capabilitatea a fost confirmată. Necesită avertisment ireversibil și confirmare întărită; nu rulează ca efect secundar al bootstrap-ului, reconectării sau unui retry generic.
- Căile remote sunt validate (`/SD/…`, fără `..`) înainte de acces sau mutație pe fișiere.
- Requesturile de polling/refresh pot folosi GET și HEAD. Chiar dacă protocolul camerei codifică unele mutații prin GET pe `Config.cgi`, aplicația le clasifică drept mutații: fără retry automat implicit pentru mutații non-idempotente/destructive și fără reluare accidentală la reconectare.
- Downloadul validează calea `/SD/`, numele local și dimensiunea și nu suprascrie fișiere existente.
- Clipurile și datele `.NMEA` pot conține imagini, coordonate GPS și alte date personale; păstrează-le local și protejează-le corespunzător.

Înaintea oricărei funcții destructive: confirmare explicită în UI/CLI, revalidarea exactă a țintei și a stării camerei, request fără retry și teste pe mock transport. După operație, aplicația verifică răspunsul protocolului și reîncarcă starea înainte de a raporta succesul. Erorile parțiale sunt raportate per țintă și nu declanșează automat repetarea operației.

Aceste reguli tehnice nu reprezintă o aprobare juridică. Utilizatorul este responsabil să respecte legislația aplicabilă, drepturile asupra înregistrărilor și termenii dispozitivului/aplicației.
