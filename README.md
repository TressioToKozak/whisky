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
| Wydań w „Inne” | 56 |
| Wydań z aromatami | 123 |
| Opisów PL / EN | 638 / 638 |
| Potwierdzonych kodów | 241 |
| Wydań z potwierdzonym kodem | 244 |
| Wycenionych pozycji | 632 |
| Pozycji bez wyceny | 6 |
| Referencji poza sumą kolekcji | 18 |
| Krajów pochodzenia | 8 |
| Pozycji z nieustalonym krajem | 1 |
<!-- catalog-stats:end -->

„Marki” oznaczają różne wartości pola `brand`; grupy wyboru to odrębna liczba. Suntory obejmuje linie Toki, Hibiki, Yamazaki i Hakushu. Osobny kafelek powstaje automatycznie od **4 różnych katalogowych ID** jednej znormalizowanej marki. Marki z 1–3 wydaniami trafiają do „Inne”; własne whisky nie podnoszą progu. Apostrofy i aliasy są normalizowane, a Johnnie Walker i John Walker & Sons pozostają wspólną grupą. `brands.ts` zawiera tylko opcjonalne logotypy i kolejność znanych marek; nowa grupa bez grafiki dostaje kafelek tekstowy. W „Inne” działa filtr marki i wyszukiwanie po jej nazwie. Katalog zachowuje osobne etykiety, opakowania i rzadkie wydania, więc liczba pozycji nie oznacza liczby unikatowych receptur.

## Funkcje i dane użytkownika

- Barek zapisuje całkowitą liczbę butelek oraz liczbę otwartych. Zamknięte = wszystkie − otwarte; otwartych nigdy nie może być więcej niż wszystkich. Skan dodaje jedną zamkniętą butelkę. Filtry „Otwarte” i „Nieotwarte” mogą pokazać to samo wydanie, jeżeli masz oba rodzaje butelek.
- Wartość barku to cena razy cała liczba butelek, również otwartych. Życzenia liczą jedną butelkę każdego wydania. Brak ceny oraz oznaczone `referenceOnly` wyklucza się z obu sum. Filtry nie zmieniają sumy kolekcji.
- Oceny 1–10 co 0,5, wiele degustacji, daty, notatki, aromaty, edycja i usuwanie. Własne whisky, zdjęcia i przypisania kodów pozostają częścią dziennika.
- Ustawienia zawierają eksport pełnego JSON oraz import z walidacją, podglądem liczby wpisów, pobraniem obecnej kopii i potwierdzeniem zastąpienia danych. Niepoprawny plik niczego nie nadpisuje. Starsze poprawne kopie v1 są obsługiwane.
- Przed asynchroniczną blokadą oczekująca zmiana jest zabezpieczana synchronicznie w `dram.journal.pending.v1.*`. Po odświeżeniu lub zamknięciu karty następne otwarcie odtwarza zgodny łańcuch zmian; nowszy dziennik zatrzymuje odzyskiwanie i udostępnia szkic. Potwierdzenia pojawiają się dopiero po zapisie. Błąd późniejszej operacji pozostaje widoczny także wtedy, gdy wcześniejszy zapis kończy się sukcesem.
- Karty tej samej przeglądarki aktualizują widok po zapisie. Zapis jest kontrolowany wspólną blokadą i porównaniem aktualnej wersji. Konflikt nie nadpisuje nowszych danych; można pobrać niezapisany wariant. Nie synchronizuje to różnych urządzeń.
- Aparat, zdjęcie kodu oraz ręczny EAN/UPC/GTIN; dekodowanie lokalne. Rozpoznanie nigdy nie dodaje butelki bez potwierdzenia. Nieznany kod można powiązać z katalogiem lub własnym wpisem.
- Wyszukiwanie całego katalogu obsługuje apostrofy, polskie znaki, łączone nazwy i dowolną kolejność słów. Wyszukiwanie rozumie także polskie i angielskie nazwy aromatów. Niezależne filtry obejmują typ whisky, informację o wieku i liczbę lat, kategorię wydania i stan butelek.

Dziennik v2 jest w `dram.journal.v2`; wcześniejszy zapis `dram.journal.v1` pozostaje nietknięty. Migracja zachowuje ID i wpisy; `opened: true` daje jedną otwartą butelkę, `false` — zero. Starsza karta nie może nadpisać nowszego dziennika, bo używa wcześniejszego klucza. Jej późniejsze zmiany sygnalizuje komunikat z możliwością pobrania kopii. Ustawienia języka i regionu mają osobny klucz `dram.preferences.v1`.

Blokada zapisu korzysta ze wspólnej transakcji IndexedDB; Web Locks stanowi dodatkową warstwę w obsługujących je przeglądarkach. IndexedDB przechowuje wyłącznie strukturę koordynacji, nie kopię dziennika. Jeśli bezpieczna blokada albo zapis nie są dostępne, aplikacja zgłasza błąd i zachowuje dotychczasowe dane. Przy braku miejsca migracja nie usuwa starszego zapisu; można go wyeksportować. Przeglądarka może usunąć dane po czyszczeniu pamięci — warto pobierać kopie.

## Klasyfikacja i wiarygodność

`whiskyType` jest niezależny od kategorii Klasyka / Edycja specjalna / Kolekcjonerska. Likiery, napoje smakowe i historyczne wydania pozostają w tych samych listach. `ageStatus` odróżnia deklarowany wiek, potwierdzone NAS oraz brak danych. Samo `age: null` nie oznacza NAS. Dla nieustalonego typu lub wieku aplikacja nie zgaduje.

`country` oznacza kraj pochodzenia/produkcji, `region` region produkcji, a opcjonalne `salesMarket` rynek sprzedaży. Nie wyprowadzamy kraju z języka strony sprzedawcy. Dla europejskiego Jim Beam Peach 32,5% kraj jest nieustalony: wcześniejsze wskazanie Hiszpanii przez sklep nie zostało niezależnie potwierdzone, a amerykańska karta producenta potwierdza bazowy bourbon z Kentucky, nie produkcję tego europejskiego wariantu.

Ceny mają źródło, datę, pojemność, walutę oryginalną i rodzaj notowania. Preferowane są oferty NL; występują też referencje zagraniczne, wyniki/mediany aukcji oraz jawnie oznaczone ceny zgłoszone przez użytkownika. Zachowano dotychczasowe zasady wyceny, również wyprzedanych i archiwalnych wydań. Kursy oraz ograniczenia importu/dostawy są opisane przy cenie. PLN bez polskiej oferty oznacza przeliczenie referencji, a nie ofertę polskiego sklepu. Sześć wcześniejszych butelek sklepowych pozostaje bez potwierdzonej ceny.

## Aromaty i języki

Przejrzano i uzupełniono profile **122 wydań**, w tym wszystkich ostatnich 40. Łącznie 123 pozycje mają tagi; zachowano wcześniejsze publiczne tagi. `data/tasting-audit-2026-10-19.json` zapisuje źródła, SHA-256, datę, konkretne fragmenty not degustacyjnych i poprzednie tagi. Puste profile pozostają puste; nie wyprowadzamy aromatów z samego rodzaju beczki ani opisu koktajlu. Osobiste aromaty degustacji nie są zmieniane.

`src/product-text.json` przechowuje opisy PL/EN według trwałego ID, oddzielnie od `src/english.json` z interfejsem. Zachowano wszystkie 241 niepustych polskich opisów. Dodano 397 krótkich polskich opisów parametrów w dotąd pustych miejscach; łącznie dostępnych jest 638 opisów PL i 638 EN. Ostatnie 40 ma indywidualne angielskie opisy smakowe. Popularne wcześniejsze wydania otrzymują podsumowanie potwierdzonych aromatów; pozostałe angielskie wpisy są krótkimi opisami parametrów katalogowych, a nie pełnym przekładem dawnych akapitów. Własne notatki i opisy nie są automatycznie tłumaczone.

## Zdjęcia i źródła

- `src/catalog.json`, `src/prices.json`, `src/barcodes.json` — dane aplikacji, trwałe ID.
- `data/catalog-sources.json` — źródło zdjęcia, wymiary, data i SHA-256.
- `data/price-evidence.json`, `data/barcode-audit.json` — dowody cen i potwierdzonych kodów; `data/barcode-coverage.json` obejmuje każdą bieżącą pozycję.
- `data/classification-audit-2026-10-19.json` — przegląd klasyfikacji wcześniejszego katalogu; `data/popular-expansion-2026-10-19.json` — wszystkie 40 nowych pozycji oraz korekty i ograniczenia.

Wcześniejsze 598 plików zdjęć pozostało bez zmian. Czterdzieści nowych fotografii jest linkowanych z oryginalnych publicznych źródeł sprzedawców, bez publikowania ich kopii w repozytorium, generowania obrazów ani przerysowywania etykiet. W szczegółach jest podpis źródła; zachowano SHA-256 sprawdzonych obrazów. Nie deklarujemy otwartej licencji do cudzych fotografii. Dostępność linkowanego obrazu zależy od źródła. Błąd ładowania pokazuje ikonę i nazwę whisky w karcie i szczegółach. Karty zachowują lazy loading. Dwie fotografie na BigCommerce używają potwierdzonych wariantów `srcset` 320/640/1024w; dla Drankgigant nie zgadujemy ścieżek cache ani nie deklarujemy pozornego zmniejszenia pobieranych plików. `tests/remote-photos.py` sprawdza dostępność i zgodność SHA przez HTTPS.

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

Instalacja narzędzi CI: `python -m pip install -r tests/requirements.txt` i `python -m playwright install --with-deps chromium`. Testy przeglądarkowe wymagają Python Playwright i Chromium (`CHROMIUM_PATH` może wskazać plik wykonywalny). Każdy plik `tests/*-e2e.py` oraz `tests/e2e.py` można uruchomić wobec lokalnego serwera:

```sh
DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/journal-e2e.py
DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/catalog-features-e2e.py
DRAM_OFFLINE_IMAGES=1 python tests/quality-e2e.py
# Osobne kontrole źródeł sieciowych:
python scripts/check-external-photos.py --report /tmp/dram-photo-report.json
python tests/remote-photos.py
```

Testy używają izolowanych przeglądarek, nigdy rzeczywistych zapisów użytkowników. Obejmują migrację v1, kompletne kopie, błędny import, konflikty z dwóch kart, szkice notatek, starszą kartę v1, blokadę bez Web Locks, otwarte/zamknięte butelki, skaner zdjęć i kamery, źródła, ceny i zachowanie ID. Testy układu sprawdzają 320–1440 px oraz dostępne kontrole WCAG. `node scripts/catalog-stats.mjs --check` wykrywa nieaktualne statystyki README.

## Publikacja

`.github/workflows/deploy-pages.yml` uruchamia instalację z lockfile, testy Node, build i dwa obowiązkowe zestawy Playwright (`quality-e2e.py`, `journal-e2e.py`), następnie publikuje przez GitHub Pages. Testy działają również na pull requestach bez publikacji; ich kolejka nie anuluje wdrożenia main. Obrazy zewnętrzne w szybkich testach CI są zastąpione jawną lokalną fixturą; audyt źródeł uruchamia się osobno przez `check-external-photos.yml` (ręcznie). Workflow czeka na ewentualną publikację legacy, żeby surowy HTML nie nadpisał buildu Vite. `scripts/check-deployment.mjs` weryfikuje publiczny HTML i skompilowane zasoby. Pełniejszy test publicznej strony: `python tests/live-smoke.py`. Manifest pozwala dodać aplikację do ekranu głównego; brak service workera, więc ponowne załadowanie wymaga sieci.

## Dokumentacja i historia

Aktualne poprawki grupowania, trwałych zmian, aromatów, tłumaczeń i CI: [raport jakości katalogu](docs/catalog-quality.md). Opis migracji, kopii, synchronizacji i rozbudowy: [niezawodność i katalog](docs/reliability-and-catalog.md). Skaner: [docs/barcode-scanning.md](docs/barcode-scanning.md). Kroje Fraunces / DM Sans: [licencje](public/font-notices.txt).

Poprzednie raporty zachowano jako **historyczne migawki**, a nie bieżące statystyki: [audyt i Jameson](docs/catalog-audit-2026-10-19.md), [projekt interfejsu](docs/redesign.md), [uproszczenie interfejsu](docs/ui-simplification.md), `data/catalog-expansion-*.json`, `data/other-category-audit-2026-10-19.json`. Ich dawne liczby i dawny model barku odnoszą się do wskazanego etapu projektu.
