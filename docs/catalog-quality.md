# Jakość katalogu, grupowanie i trwały zapis — 19.10.2026

> Historyczna migawka sprzed fazy 1 Dram 2.0. Aktualny model i zapis: [Journal v3](data-model-v3.md), [migracje](migrations.md).
Ta iteracja zachowuje 638 wydań. Nie dodano ani nie usunięto whisky; ceny, kody kreskowe, odmiany opakowań, identyfikatory i zasady wyceny pozostają bez zmian. Poprzednie audyty są zachowane jako historyczne migawki. Statystyki w README są generowane z bieżących danych.

## Automatyczne marki

`createBrandDirectory()` liczy unikalne publiczne ID, pomijając duplikaty i własne whisky. Od 4 wydań tworzy osobną grupę, poniżej progu kieruje do „Inne”. Lista grafik i priorytetów nie decyduje o przynależności ani progu. Nowe grupy bez grafiki otrzymują tekstowy kafelek. Normalizacja obejmuje apostrofy, interpunkcję, akcenty, Maker’s/Makers Mark, Macallan/The Macallan, Chivas/Chivas Regal oraz nadrzędne grupy Johnnie Walker i Suntory. Nie łączy ani nie usuwa samych wydań.

| Kafelek, w zachowanej kolejności | Publiczne wydania |
| --- | ---: |
| Jameson | 18 |
| Johnnie Walker / John Walker & Sons | 253 |
| Jack Daniel’s | 122 |
| Jim Beam | 16 |
| Goldfinch | 23 |
| Ardbeg | 36 |
| Bushmills | 33 |
| Ballantine’s | 19 |
| Suntory | 5 |
| Glenfiddich | 32 |
| Chivas Regal | 25 |
| Inne | 56 |

Marki w „Inne” można wybrać filtrem oraz wyszukać po nazwie. Progi 3/4, duplikaty ID, własne whisky, aliasy i przyszły kafelek bez logo są testowane niezależnie od rzeczywistych danych. Publiczne liczby na kafelkach nie rosną po dodaniu własnych butelek.

## Ochrona szybkich zmian

Sama kolejka Promise i blokada IndexedDB nie chroniły operacji czekającej na blokadę w chwili zamknięcia strony. `journal-store.ts` zapisuje teraz synchronicznie pełny zamiar zmiany w osobnym kluczu `dram.journal.pending.v1.*`, zanim utworzy operację asynchroniczną. Szybkie operacje są wyliczane na projektowanym wyniku wcześniejszych zmian. Ich kolejność tworzy łańcuch oczekiwanego poprzedniego JSON i nowego dziennika.

Dopiero pod wspólną blokadą następuje porównanie wersji i zapis właściwego `dram.journal.v2`. Zakończenie operacji usuwa jej zamiar. Interfejs pokazuje trwający zapis; formularze i skaner potwierdzają sukces dopiero po rzeczywistym zapisie. Błąd późniejszego kliknięcia nie zostaje zamaskowany sukcesem wcześniejszej operacji. Widok, filtry i nawigacja pozostają dostępne.

Po odświeżeniu lub zamknięciu karty następne otwarcie odzyskuje zgodny łańcuch pod tą samą blokadą. Wpis już zastosowany jest rozpoznawany bez ponownego dodawania butelek. Nowszy zapis z innej karty zatrzymuje odzyskanie sprzecznego zamiaru i pozostawia wariant do pobrania. Niepoprawne dane oczekujące nie nadpisują dziennika. Potwierdzony import przerwany podczas naprawy uszkodzonego zapisu również może zostać odzyskany. Mechanizm nie zależy od `beforeunload`.

Dodatkowe klucze wymagają miejsca: duży dziennik ze zdjęciami i wiele równoczesnych kliknięć może przekroczyć limit localStorage. W takim przypadku operacja jest jawnie odrzucona, poprzedni zapis pozostaje, a prawidłowy proponowany wariant jest dostępny jako szkic. To nie jest ochrona przed wyczyszczeniem danych przeglądarki ani synchronizacja urządzeń; nadal potrzebne są kopie JSON.

## Aromaty i opisy

- Indywidualnie przejrzano 122 profile smakowe, w tym wszystkie ostatnie 40 produktów. Łącznie 123 wydania mają tagi: jeden wcześniejszy profil spoza przeglądu pozostaje bez zmian.
- Zachowano wcześniejsze publiczne tagi, zaznaczając ich pochodzenie oddzielnie od nowych dowodów. Osobiste tagi degustacji użytkownika nie są modyfikowane.
- `data/tasting-audit-2026-10-19.json` zawiera źródło, SHA-256 strony, datę, tag i fragment konkretnej noty. Nie przenoszono nut na inne opakowania ani całą rodzinę whisky. Sam rodzaj beczki lub dodatek do koktajlu nie jest dowodem aromatu.
- Odrzucono m.in. ogólną wzmiankę o torfie w Irlandii jako dowód torfu w Writers’ Tears, dymny opis wyspy jako profil Bunnahabhain oraz niepewne twierdzenie sprzedawcy o torfowym Glenfiddich 12. Niepewne profile pozostają puste.
- Dodano Orzechy, Suszone owoce, Sherry i Kawę do dostępnych aromatów. Wyszukiwanie rozumie polskie i angielskie etykiety bez zmieniania zapisanych wartości.
- `product-text.json` używa trwałych ID. Zachowano 241 dotychczasowych niepustych opisów PL; w 397 dotąd pustych miejscach dodano krótkie polskie opisy potwierdzonych parametrów, z profilem smakowym tam, gdzie był przejrzany.
- Dostępnych jest 638 niepustych wpisów PL i 638 EN. Ostatnie 40 ma indywidualne angielskie noty smakowe. Popularne wcześniejsze pozycje mają angielskie podsumowania parametrów i potwierdzonych aromatów. Pozostałe opisy EN są krótkimi podsumowaniami parametrów, **nie pełnymi przekładami wcześniejszych narracyjnych akapitów**. Pole `plKind`/`enKind` rozróżnia rodzaje treści.
- Nazwy własne są zachowane. Własne opisy i notatki nie są tłumaczone. Słownik interfejsu nie używa katalogowych akapitów jako kluczy.

## Zdjęcia

`Photo` zachowuje oryginalne adresy i lazy loading kart. Brak pliku daje placeholder z nazwą marki i whisky, również w szczegółach. Stan błędu dotyczy konkretnego źródła, więc zmiana whisky nie dziedziczy błędu poprzedniego zdjęcia. Dopasowanie CSS i oryginały pozostają bez zmian.

Dla dwóch źródeł BigCommerce potwierdzono warianty 320/640/1024w i dodano `srcset`/`sizes`. Dla 38 zdjęć Drankgigant nie znaleziono udokumentowanego stabilnego mechanizmu zmniejszania; aplikacja nadal korzysta z oryginałów. Nie zgaduje adresów cache, nie tworzy pozornego `srcset` wskazującego te same duże pliki ani nie kopiuje cudzych zdjęć do repozytorium.

`python scripts/check-external-photos.py --report /tmp/dram-photo-report.json` sprawdza każde źródło niezależnie, zbiera błędy, rozpoznaje zmianę SHA i nie edytuje katalogu. W tej iteracji wszystkie 44 URL (40 oryginałów + 4 mniejsze warianty) zwróciły prawidłowe obrazy, bez zmian SHA oryginałów. To kontrola dostępności w dniu badania, nie gwarancja przyszłej dostępności.

## CI i weryfikacja

Workflow publikacji uruchamia także dwa zestawy Playwright przed uploadem artefaktu: `quality-e2e.py` i `journal-e2e.py`. Pokrywają start, wyszukiwanie, marki/typy, rzeczywiste grupowanie, dodawanie/usuwanie stanu, ilość i otwarte butelki, szybkie zmiany i przerwane zapisy, kopie, migrację, dwie karty, konflikty, mobilny układ i błędy JavaScript. Testy działają również na PR, bez publikacji. Kolejka PR nie anuluje wdrożenia main.

Szybkie CI używa jawnej lokalnej fixtury dla zewnętrznych obrazów, aby dostępność sklepów nie blokowała aplikacji. Test symulowanego błędu obrazu nadal sprawdza nazwany placeholder. Ręczny workflow `Check external photograph sources` wykonuje osobny rzeczywisty audyt sieciowy i zachowuje raport jako artefakt. Zależności narzędzi testowych są przypięte w `tests/requirements.txt`.

Test zachowania danych porównuje cały katalog 638 rekordów (poza autoryzowanym uzupełnieniem tagów) ze stanem `eb04360`; pliki cen, kodów, źródeł zdjęć i kadrów mają niezmienione SHA-256. Starszy audyt 598 pozycji też pozostaje sprawdzany, wraz z zachowaniem dawnych tagów.

Przeszło **58 testów Node**, build Vite i sprawdzenie TypeScript bez nieużywanych symboli. Przeszło **11 zestawów E2E**: podstawowy dziennik, skaner, marki, odkrywanie i wycena, skaner/życzenia, układ, preferencje, wcześniejszy audyt, niezawodność dziennika, 40 ostatnich produktów oraz nowe testy jakości. Kontrola układu objęła 60 widoków na szerokościach 320, 375, 390, 768, 1024 i 1440 px; axe WCAG A/AA nie zgłosił naruszeń. Testy przeglądarkowe nie zastępują prób na fizycznym telefonie.

W pierwszej regresji ujawnił się zbyt mały tekst pomocniczy nowego placeholdera; zwiększono go do 13 px. Dwa starsze testy czytały wynik usuwania przed zakończeniem zapisu — teraz oczekują zamknięcia dialogu i dopiero sprawdzają dane. Asercje pozostały aktywne. Nowe testy wykryły również maskowanie błędu odzyskiwania przez sukces kolejnego wpisu; poprawiono zachowanie komunikatu i dodano regresję.

Publikacja korzysta z istniejącego workflow GitHub Pages; wynik bieżącego uruchomienia jest dostępny w Actions. Zachowano dotychczasowe oczekiwanie na publikację legacy. Ustawienie źródła Pages pozostaje ograniczeniem opisanym w poprzednim raporcie: przełączenie na GitHub Actions wymaga uprawnień właściciela repozytorium.

## Zmienione pliki

<!-- changed-files:start -->
- `.github/workflows/check-external-photos.yml`
- `.github/workflows/deploy-pages.yml`
- `README.md`
- `data/quality-preservation-baseline-2026-10-19.json`
- `data/tasting-audit-2026-10-19.json`
- `docs/catalog-quality.md`
- `scripts/catalog-stats.mjs`
- `scripts/check-external-photos.py`
- `scripts/wait-for-app.py`
- `src/App.tsx`
- `src/brands.ts`
- `src/catalog.json`
- `src/components/Discovery.tsx`
- `src/components/Primitives.tsx`
- `src/components/WhiskyDetails.tsx`
- `src/english.json`
- `src/journal-store.ts`
- `src/model.ts`
- `src/photo-sources.ts`
- `src/product-text.json`
- `src/product-text.ts`
- `src/styles.css`
- `src/useJournal.ts`
- `tests/barcode-e2e.py`
- `tests/e2e.py`
- `tests/journal-e2e.py`
- `tests/pending-journal.test.mjs`
- `tests/preservation.test.mjs`
- `tests/quality-e2e.py`
- `tests/quality.test.mjs`
- `tests/requirements.txt`
- `tests/source_images.py`
<!-- changed-files:end -->
