> Historyczna migawka interfejsu. Aktualny model danych, kopie i synchronizację opisuje [niezawodność dziennika](reliability-and-catalog.md).

# Dram: przebudowa interfejsu, 18.10.2026

Opis wcześniejszego etapu projektu. Aktualne uproszczenie ekranu startowego, kart i szczegółów opisuje [ui-simplification.md](ui-simplification.md).

## Zmiany

- Typograficzny znak `dram.`, ciepłe tło i miedziany akcent. Lokalnie dostarczane Fraunces i DM Sans; bez zewnętrznego serwisu fontów.
- Ekran startowy z rzeczywistą liczbą butelek, wartością barku, ostatnią degustacją i globalną wyszukiwarką. Pusty dziennik nie zawiera danych demonstracyjnych.
- Katalog marek z oryginalnymi logotypami: wyróżnione dwa większe wpisy oraz spokojna lista pozostałych marek.
- Karty: fotografia i pełna nazwa, czytelne parametry, cena z charakterem źródła, dyskretne akcje. Lista na telefonach, siatka na komputerach.
- Szczegóły butelki: fotografia, parametry, pochodzenie ceny, akcje i własne degustacje. Mobilny arkusz z przewijaniem, pułapką fokusu i obsługą Escape.
- Barek: wartość niezależna od filtrów, brakujące wyceny, liczba butelek i otwartych pozycji, szybka zmiana ilości oraz filtr otwartych butelek. Skaner pozostaje dostępny w nagłówku i barku.
- Oceny: chronologiczny dziennik z datami, notatkami, aromatami i edycją. Formularz oceny ma suwak i przyciski co 0,5 punktu.
- Osobne hierarchie akcji, minimum 11 px dla widocznego tekstu, główne cele dotykowe 44 px, widoczny focus i reduced motion.

## Pliki i granice

`src/App.tsx` integruje widoki i dotychczasowe operacje dziennika. `src/components/` wydziela Discovery, WhiskyCard, WhiskyDetails, ReviewJournal oraz wspólne prymitywy. `src/styles.css` zastępuje poprzedni arkusz, zamiast dopisywać drugi motyw. `src/main.tsx`, `package.json` i lockfile dostarczają fonty; `index.html`, manifest i ikona aktualizują tożsamość aplikacji.

Nie zmieniono identyfikatorów, katalogu 541 produktów, cen, źródeł, zdjęć, danych kadrowania ani schematu `dram.journal.v1`. Nie dodano backendu, kont ani fikcyjnych informacji degustacyjnych. Przykładowy dziennik istnieje wyłącznie w izolowanym teście.

## Weryfikacja

Instalacja `npm ci`, testy modelu `npm test`, kompilacja `npm run build` i kontrola nieużywanego kodu TypeScript. Dotychczasowe scenariusze przeglądarkowe zachowano, dostosowując selektory do nowych nazw i prezentacji: `e2e.py`, `brands-e2e.py`, `discovery-cellar-e2e.py`, `barcode-e2e.py`.

Nowy `tests/redesign-e2e.py` sprawdza 10 widoków w szerokościach 320, 375, 390, 768, 1024 i 1440 px, zapisując 60 zrzutów ekranu. Obejmuje brak poziomego overflow, typografię, rozmiar głównych interakcji, długie nazwy, rzeczywiste podsumowanie, stan barku, zapis starszego dziennika i powiązań kodów, klawiaturę, Escape, powrót fokusu i reduced motion. Opcjonalne `AXE_SCRIPT` wskazuje lokalny plik axe-core do kontroli WCAG A/AA; bez niego test wyraźnie zgłasza pominięcie kontroli axe. W tej sesji axe-core został uruchomiony i nie wykrył naruszeń w kontrolowanych widokach.

Uruchomienie po zbudowaniu i uruchomieniu preview:

```sh
DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/redesign-e2e.py
```

## Ograniczenia

Testy wykonano w Chromium z emulacją rozmiarów ekranu, bez fizycznego iPhone’a lub telefonu Android. Automatyczna kontrola dostępności nie jest certyfikacją ani pełnym testem czytników ekranu. Kamera i kadrowanie zależą również od przeglądarki; dotychczasowe fallbacki pozostają dostępne. Zmiana UI nie rozszerza katalogu ani bazy kodów kreskowych.
