# Securitate și utilizare legitimă

Proiectul este destinat interoperabilității cu un dispozitiv deținut și controlat de utilizator.

Dashboardul web ascultă exclusiv pe `127.0.0.1`. Coordonatele GPS sunt procesate și desenate local; nu sunt trimise către furnizori de hărți sau alte servicii externe.

**Produs mobil comercial:** read-only în mod implicit. Poate expune operații mutative limitate, numai la acțiunea directă a utilizatorului și numai pentru o cameră pe care acesta o deține sau este autorizat să o administreze. Allowlistul mobil acoperă Frequency, EV, Date & Time, Time Zone, Daylight Saving Time, ștergerea explicită a fișierelor selectate de pe card și formatarea explicită a cardului SD. Documente pregătitoare: [docs/legal/](legal/), [docs/compatibility.md](compatibility.md), [docs/mobile/phase0-audit.md](mobile/phase0-audit.md). Materialele APK/XAPK rămân în carantină juridică — vezi banner-ele din [protocol.md](protocol.md) și [research-notes.md](research-notes.md).

- Nu include și nu redistribuie APK/XAPK, firmware sau chei.
- Nu stochează parola Wi-Fi.
- Nu implementează update sau upload de firmware.
- Dashboardul/CLI păstrează gate-ul `MIVUE_ALLOW_MUTATE=1`. Aplicația mobilă nu folosește această variabilă Node; ea aplică un allowlist fix, verificări de capabilitate și confirmare separată pentru fiecare acțiune mutativă.
- Setările camerei sunt limitate la Frequency, EV, Date & Time, Time Zone și Daylight Saving Time. UI-ul afișează valoarea curentă și cea propusă, iar aplicarea necesită confirmare explicită.
- Ștergerea pe cameră este permisă numai pentru fișiere selectate explicit. Căile sunt revalidate imediat înainte de execuție, iar selecția bulk necesită o confirmare întărită care include numărul de fișiere.
- Formatarea cardului SD este permisă numai dintr-un ecran dedicat, când camera este conectată și capabilitatea a fost confirmată. Necesită avertisment ireversibil, confirmare în doi pași și introducerea unei expresii de confirmare; nu rulează niciodată automat.
- Căile remote sunt validate (`/SD/…`, fără `..`) înainte de acces sau delete.
- Requesturile automate rămân GET și HEAD. Chiar dacă protocolul camerei codifică unele mutații prin GET pe `Config.cgi`, aplicația le clasifică drept mutații: se execută numai la gest explicit, cu politica `mutation`, fără retry automat și fără reluare la reconectare.
- Downloadul validează calea `/SD/`, numele local și dimensiunea și nu suprascrie fișiere existente.
- Clipurile și datele `.NMEA` pot conține imagini, coordonate GPS și alte date personale; păstrează-le local și protejează-le corespunzător.

Înaintea oricărei funcții destructive: confirmare explicită în UI/CLI, revalidarea exactă a țintei și a stării camerei, request fără retry și teste pe mock transport. După operație, aplicația verifică răspunsul protocolului și reîncarcă starea înainte de a raporta succesul. Erorile parțiale sunt raportate per țintă și nu declanșează automat repetarea operației.

Aceste reguli tehnice nu reprezintă o aprobare juridică. Utilizatorul este responsabil să respecte legislația aplicabilă, drepturile asupra înregistrărilor și termenii dispozitivului/aplicației.
