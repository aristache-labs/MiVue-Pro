# Troubleshooting

## Camera nu este găsită

1. Verifică dacă Wi-Fi-ul camerei este activ și SSID-ul este vizibil.
2. Deconectează telefonul; camera poate accepta un singur client.
3. Rulează `npm run dev -- discover --debug`.
4. Încearcă `npm run dev -- info --host 192.72.1.1`.

## Windows spune „Can't connect to this network”

Profilul vechi poate avea WPA3/GCMP, în timp ce camera emite WPA2/CCMP. Elimină profilul cunoscut, reactivează Wi-Fi-ul camerei și reconectează-te cu parola afișată de cameră. Adaptorul testat a fost Intel AX211.

## Camera se deconectează după câteva secunde

Acest comportament a fost observat pe dispozitivul testat. Reactivează Wi-Fi-ul din meniul camerei și rulează comanda imediat. Menține aplicația oficială închisă pe telefon.

Dacă Wi-Fi-ul este asociat, dar `/cgi-bin/Config.cgi` răspunde `404 Not Found`, serverul AIT a rămas într-o stare în care handlerul CGI nu este activ. Oprește și repornește Wi-Fi-ul din meniul camerei; CLI-ul nu trimite automat `AppExit=YES`, deoarece aceasta este o comandă de modificare încă neconfirmată.

## Internet și cameră simultan

Folosește Ethernet pentru internet și Wi-Fi pentru cameră. În configurația observată nu există conflict de subnet: routerul era în `192.168.1.0/24`, camera în `192.72.1.0/24`. Internet Connection Sharing nu este necesar.

## Proxy

Unele comenzi Windows au trimis requesturile locale prin proxy și au expirat. CLI-ul folosește `node:http` direct către adresa camerei și nu consultă variabilele HTTP proxy.
