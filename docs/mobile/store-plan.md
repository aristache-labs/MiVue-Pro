# Plan App Store / Google Play

**Statut:** Faza 1 — plan operațional  
**Detalii juridice:** [../legal/store-compliance.md](../legal/store-compliance.md)  
**Produs:** Laneory  
**Listing draft:** [store-listing.md](store-listing.md)  
**Data:** 20 iulie 2026

Nu se creează conturi de dezvoltator și nu se trimite build fără aprobarea explicită a titularului.

## 1. Poziționare listing (draft)

- Aplicație **independentă**; disclaimer de neafiliere (text din `trademark-usage.md`).
- Compatibilitate: numai Mio MiVue 866 + firmware documentat în [../compatibility.md](../compatibility.md).
- Evită: „oficial”, „aprobat de Mio”, „toate camerele”, „transfer garantat în background”, „fără colectare de date” dacă există SDK/hartă online.

## 2. iOS — checklist implementare

| Item | Cerință |
|---|---|
| `NSLocalNetworkUsageDescription` | text clar: conectare la camera din rețeaua locală |
| Local Network permission | prompt la acțiunea de conectare |
| ATS | excepție minimă HTTP doar pentru host/rețea locală cameră |
| Photos / Files | doar la export cerut de utilizator |
| Background download | prototip + UI onest despre limite; fără promisiuni false |
| `NEHotspotConfiguration` | doar dacă e necesar și cu aprobare utilizator |
| Demo Mode | obligatoriu pentru review |
| App Privacy | completat după analiză trafic build final |
| Privacy Policy URL | obligatoriu |
| Review Notes | hardware extern, Demo Mode, operații pe cameră, de ce local network |

## 3. Android — checklist implementare

| Item | Cerință |
|---|---|
| `INTERNET` | da |
| `ACCESS_NETWORK_STATE` | da dacă e folosit |
| `NEARBY_WIFI_DEVICES` / local network | numai dacă API-urile o cer; `neverForLocation` dacă adevărat |
| Locație telefon | **nu** pentru GPS din NMEA |
| Foreground service | pentru transfer lung user-visible + notificare; declarație Play |
| Notificări | conform target SDK |
| Cleartext | limitat la IP/rețea locală cameră, nu global |
| Storage | privat + SAF/share; **fără** `MANAGE_EXTERNAL_STORAGE` |
| Demo Mode | obligatoriu pentru review |
| Data Safety | după inventar SDK + trafic |

## 4. Demo Mode în review

Vezi [demo-mode.md](demo-mode.md). Review notes trebuie să includă:

1. Aplicația este independentă, nu Mio/MiTAC.
2. Hardware: MiVue 866 pe Wi‑Fi local (opțional video redactat).
3. Pași Demo Mode (fără cameră).
4. De ce rețea locală.
5. Setări/ștergere pe cameră doar când e confirmat pe model; fără update firmware neautorizat.

## 5. Declarații privacy (ordine)

1. Freeze dependențe release.
2. Captură trafic iOS + Android (local-only vs tile).
3. Completează App Privacy / Data Safety.
4. Publică Privacy Policy + link în app și console.
5. Reverificare reguli magazin ≤7 zile înainte de submit (gate Faza 4).

## 6. Gate

- [ ] Demo Mode complet
- [ ] Permisiuni minime justificate
- [ ] Cleartext/ATS configurate
- [ ] Disclaimer + compatibilitate corecte
- [ ] Opinie IP/marcă (checklist legal)
- [ ] Aprobare titular pentru submit
