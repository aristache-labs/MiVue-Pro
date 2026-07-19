# Securitate și utilizare legitimă

Proiectul este destinat interoperabilității cu un dispozitiv deținut și controlat de utilizator.

Dashboardul web ascultă exclusiv pe `127.0.0.1`. Coordonatele GPS sunt procesate și desenate local; nu sunt trimise către furnizori de hărți sau alte servicii externe.

- Nu include și nu redistribuie APK/XAPK, firmware sau chei.
- Nu stochează parola Wi-Fi.
- Nu implementează update sau upload de firmware.
- Format card SD este exclus temporar din produs.
- Ștergerea pe cameră / `action=set` sunt **gated**: dashboardul le acceptă numai dacă `MIVUE_ALLOW_MUTATE=1`. Implicit mutate e oprit.
- Căile remote sunt validate (`/SD/…`, fără `..`) înainte de acces sau delete.
- Requesturile automate read-only rămân GET și HEAD; mutate CGI folosește tot GET pe `Config.cgi` (contract AIT), dar numai prin API/CLI explicite.
- Downloadul validează calea `/SD/`, numele local și dimensiunea și nu suprascrie fișiere existente.
- Clipurile și datele `.NMEA` pot conține imagini, coordonate GPS și alte date personale; păstrează-le local și protejează-le corespunzător.

Înaintea oricărei funcții destructive: confirmare explicită în UI/CLI (`--confirm`), validarea exactă a căii și teste pe mock transport. Utilizatorul este responsabil să respecte legislația aplicabilă și termenii dispozitivului/aplicației.
