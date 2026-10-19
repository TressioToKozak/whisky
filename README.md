# Dram — dziennik whisky

Aplikacja React + TypeScript + Vite na telefon i komputer: katalog whisky, własny barek, lista życzeń i dziennik degustacji. Interfejs PL/EN, region Polska (PLN) lub Holandia (EUR), bez obowiązkowego konta i backendu.

## Aktualny stan

Statystyki wynikają z danych katalogu; `npm test` sprawdza ich zgodność. Aktualizacja: `node scripts/catalog-stats.mjs --write`.

<!-- catalog-stats:start -->
| Aktualny katalog | Liczba |
| --- | ---: |
| Wydań | 638 |
| Nazw marek w katalogu | 61 |
| Grup wyboru | 12 (11 marek + „Inne”) |
| Potwierdzonych kodów | 241 |
| Wydań z potwierdzonym kodem | 244 |
| Wycenionych pozycji | 632 |
| Pozycji bez wyceny | 6 |
| Referencji poza sumą kolekcji | 18 |
| Krajów pochodzenia | 8 |
| Pozycji z nieustalonym krajem | 1 |
<!-- catalog-stats:end -->

„Marki” oznaczają różne wartości pola `brand`; grupy wyboru to odrębna liczba. Suntory obejmuje linie Toki, Hibiki, Yamazaki i Hakushu. Pozostałe marki spoza nazwanych grup są w „Innych”. Katalog zachowuje osobne etykiety, opakowania i rzadkie wydania, więc liczba pozycji nie oznacza liczby unikatowych receptur.

## Funkcje i dane użytkownika

- Barek zapisuje całkowitą liczbę butelek oraz liczbę otwartych. Zamknięte = wszystkie − otwarte; otwartych nigdy nie może być więcej niż wszystkich. Skan dodaje jedną zamkniętą butelkę. Filtry „Otwarte” i „Nieotwarte” mogą pokazać to samo wydanie, jeżeli masz oba rodzaje butelek.
- Wartość barku to cena razy cała liczba butelek, również otwartych. Życzenia liczą jedną butelkę każdego wydania. Brak ceny oraz oznaczone `referenceOnly` wyklucza się z obu sum. Filtry nie zmieniają sumy kolekcji.
- Oceny 1–10 co 0,5, wiele degustacji, daty, notatki, aromaty, edycja i usuwanie. Własne whisky, zdjęcia i przypisania kodów pozostają częścią dziennika.
- Ustawienia zawierają eksport pełnego JSON oraz import z walidacją, podglądem liczby wpisów, pobraniem obecnej kopii i potwierdzeniem zastąpienia danych. Niepoprawny plik niczego nie nadpisuje. Starsze poprawne kopie v1 są obsługiwane.
- Karty tej samej przeglądarki aktualizują widok po zapisie. Zapis jest kontrolowany wspólną blokadą i porównaniem aktualnej wersji. Konflikt nie nadpisuje nowszych danych; można pobrać niezapisany wariant. Nie synchronizuje to różnych urządzeń.
- Aparat, zdjęcie kodu oraz ręczny EAN/UPC/GTIN; dekodowanie lokalne. Rozpoznanie nigdy nie dodaje butelki bez potwierdzenia. Nieznany kod można powiązać z katalogiem lub własnym wpisem.
- Wyszukiwanie całego katalogu obsługuje apostrofy, polskie znaki, łączone nazwy i dowolną kolejność słów. Niezależne filtry obejmują typ whisky, informację o wieku i liczbę lat, kategorię wydania i stan butelek.

Dziennik v2 jest w `dram.journal.v2`; wcześniejszy zapis `dram.journal.v1` pozostaje nietknięty. Migracja zachowuje ID i wpisy; `opened: true` daje jedną otwartą butelkę, `false` — zero. Starsza karta nie może nadpisać nowszego dziennika, bo używa wcześniejszego klucza. Jej późniejsze zmiany sygnalizuje komunikat z możliwością pobrania kopii. Ustawienia języka i regionu mają osobny klucz `dram.preferences.v1`.

Blokada zapisu korzysta ze wspólnej transakcji IndexedDB; Web Locks stanowi dodatkową warstwę w obsługujących je przeglądarkach. IndexedDB przechowuje wyłącznie strukturę koordynacji, nie kopię dziennika. Jeśli bezpieczna blokada albo zapis nie są dostępne, aplikacja zgłasza błąd i zachowuje dotychczasowe dane. Przy braku miejsca migracja nie usuwa starszego zapisu; można go wyeksportować. Przeglądarka może usunąć dane po czyszczeniu pamięci — warto pobierać kopie.

## Klasyfikacja i wiarygodność

`whiskyType` jest niezależny od kategorii Klasyka / Edycja specjalna / Kolekcjonerska. Likiery, napoje smakowe i historyczne wydania pozostają w tych samych listach. `ageStatus` odróżnia deklarowany wiek, potwierdzone NAS oraz brak danych. Samo `age: null` nie oznacza NAS. Dla nieustalonego typu lub wieku aplikacja nie zgaduje.

`country` oznacza kraj pochodzenia/produkcji, `region` region produkcji, a opcjonalne `salesMarket` rynek sprzedaży. Nie wyprowadzamy kraju z języka strony sprzedawcy. Dla europejskiego Jim Beam Peach 32,5% kraj jest nieustalony: wcześniejsze wskazanie Hiszpanii przez sklep nie zostało niezależnie potwierdzone, a amerykańska karta producenta potwierdza bazowy bourbon z Kentucky, nie produkcję tego europejskiego wariantu.

Ceny mają źródło, datę, pojemność, walutę oryginalną i rodzaj notowania. Preferowane są oferty NL; występują też referencje zagraniczne, wyniki/mediany aukcji oraz jawnie oznaczone ceny zgłoszone przez użytkownika. Zachowano dotychczasowe zasady wyceny, również wyprzedanych i archiwalnych wydań. Kursy oraz ograniczenia importu/dostawy są opisane przy cenie. PLN bez polskiej oferty oznacza przeliczenie referencji, a nie ofertę polskiego sklepu. Sześć wcześniejszych butelek sklepowych pozostaje bez potwierdzonej ceny.

## Zdjęcia i źródła

- `src/catalog.json`, `src/prices.json`, `src/barcodes.json` — dane aplikacji, trwałe ID.
- `data/catalog-sources.json` — źródło zdjęcia, wymiary, data i SHA-256.
- `data/price-evidence.json`, `data/barcode-audit.json` — dowody cen i potwierdzonych kodów; `data/barcode-coverage.json` obejmuje każdą bieżącą pozycję.
- `data/classification-audit-2026-10-19.json` — przegląd klasyfikacji wcześniejszego katalogu; `data/popular-expansion-2026-10-19.json` — wszystkie 40 nowych pozycji oraz korekty i ograniczenia.

Wcześniejsze 598 plików zdjęć pozostało bez zmian. Czterdzieści nowych fotografii jest linkowanych z oryginalnych publicznych źródeł sprzedawców, bez publikowania ich kopii w repozytorium, generowania obrazów ani przerysowywania etykiet. W szczegółach jest podpis źródła; zachowano SHA-256 sprawdzonych obrazów. Nie deklarujemy otwartej licencji do cudzych fotografii. Dostępność linkowanego obrazu zależy od źródła. `tests/remote-photos.py` sprawdza dostępność i zgodność SHA przez HTTPS.

`src/photo-layout.json` oraz `data/photo-framing.json` przechowują nieinwazyjne kadrowanie CSS. `python scripts/analyze-photos.py` mierzy lokalne oryginały i zachowuje zatwierdzone kadry zdjęć linkowanych; nie pobiera ich ani nie publikuje automatycznie. Wszystkie pola zdjęć mają białe tło; zachowano rzeczywiste etykiety, perspektywę i cienie. Logotyp Suntory pochodzi bezpośrednio z House of Suntory, pozostałe źródła opisuje `data/brand-sources.json`.

## Uruchomienie i testy

Node.js 24, npm; ścieżka bazowa `/whisky/`.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Testy przeglądarkowe wymagają Python Playwright i Chromium (`CHROMIUM_PATH` może wskazać plik wykonywalny). Każdy plik `tests/*-e2e.py` oraz `tests/e2e.py` można uruchomić wobec lokalnego serwera:

```sh
DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/journal-e2e.py
DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/catalog-features-e2e.py
python tests/remote-photos.py
```

Testy używają izolowanych przeglądarek, nigdy rzeczywistych zapisów użytkowników. Obejmują migrację v1, kompletne kopie, błędny import, konflikty z dwóch kart, szkice notatek, starszą kartę v1, blokadę bez Web Locks, otwarte/zamknięte butelki, skaner zdjęć i kamery, źródła, ceny i zachowanie ID. Testy układu sprawdzają 320–1440 px oraz dostępne kontrole WCAG. `node scripts/catalog-stats.mjs --check` wykrywa nieaktualne statystyki README.

## Publikacja

`.github/workflows/deploy-pages.yml` uruchamia instalację z lockfile, testy i build, następnie publikuje przez GitHub Pages. Workflow czeka na ewentualną publikację legacy, żeby surowy HTML nie nadpisał buildu Vite. `scripts/check-deployment.mjs` weryfikuje publiczny HTML i skompilowane zasoby. Pełniejszy test publicznej strony: `python tests/live-smoke.py`. Manifest pozwala dodać aplikację do ekranu głównego; brak service workera, więc ponowne załadowanie wymaga sieci.

## Dokumentacja i historia

Aktualny opis migracji, kopii, synchronizacji i rozbudowy: [niezawodność i katalog](docs/reliability-and-catalog.md). Skaner: [docs/barcode-scanning.md](docs/barcode-scanning.md). Kroje Fraunces / DM Sans: [licencje](public/font-notices.txt).

Poprzednie raporty zachowano jako **historyczne migawki**, a nie bieżące statystyki: [audyt i Jameson](docs/catalog-audit-2026-10-19.md), [projekt interfejsu](docs/redesign.md), [uproszczenie interfejsu](docs/ui-simplification.md), `data/catalog-expansion-*.json`, `data/other-category-audit-2026-10-19.json`. Ich dawne liczby i dawny model barku odnoszą się do wskazanego etapu projektu.
