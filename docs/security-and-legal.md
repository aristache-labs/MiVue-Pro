# Securitate și utilizare legitimă

Proiectul este destinat interoperabilității cu un dispozitiv deținut și controlat de utilizator.

Dashboardul web ascultă exclusiv pe `127.0.0.1`. Coordonatele GPS sunt procesate și desenate local; nu sunt trimise către furnizori de hărți sau alte servicii externe.

- Nu include și nu redistribuie APK/XAPK, firmware sau chei.
- Nu stochează parola Wi-Fi.
- Nu implementează update sau upload de firmware.
- Nu implementează ștergerea în această versiune.
- Căile remote sunt validate înainte de acces.
- Requesturile automate sunt limitate la GET și HEAD.
- Downloadul validează calea `/SD/`, numele local și dimensiunea și nu suprascrie fișiere existente.
- Clipurile și datele `.NMEA` pot conține imagini, coordonate GPS și alte date personale; păstrează-le local și protejează-le corespunzător.

Înaintea oricărei funcții destructive trebuie adăugate confirmare explicită, validarea exactă a căii și teste pe mock transport. Utilizatorul este responsabil să respecte legislația aplicabilă și termenii dispozitivului/aplicației.
