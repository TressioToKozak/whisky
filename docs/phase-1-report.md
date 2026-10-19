# Dram 2.0 — raport fazy 1

Stan bazowy: `ddbcbb3`. Ukończony zakres tej iteracji: fundament kolekcjonerski, zgodnie z kolejnością faz w zleceniu. Pełny zakres Dram 2.0 ma dalsze etapy opisane w [roadmapie](roadmap.md).

## Wdrożone funkcje

- Journal v3: osobne ID fizycznych egzemplarzy, statusy, zakup/sprzedaż i waluty, napełnienie, numery i stan zachowania, prywatne notatki, fotografie i dokumenty, drzewo lokalizacji oraz historia rzeczywistych zmian.
- Migracja v1/v2 zachowuje recenzje, własne wydania, fotografie, życzenia i kody. Pięć butelek / dwie otwarte daje pięć odrębnych rekordów, dwa otwarte. Nieznane dane pozostają nieznane; migracja nie dopisuje zdarzeń.
- Istniejący skaner i kontrolki ilości zmieniają teraz fizyczne egzemplarze. Szybkie zmniejszenie stanu archiwizuje, bez fabrykowania sprzedaży czy opróżnienia. Historia pozostaje dostępna, status można skorygować.
- Edytor egzemplarza, dodawanie wielu kopii, statusy i filtry, wyszukiwanie lokalizacji, sortowanie, hierarchia lokalizacji i ruch masowy.
- Koszty według walut, nieznane koszty i prezenty oddzielnie, referencja zamkniętych egzemplarzy oraz rzeczywiste wpływy brutto/netto i wynik przy kompletnych danych. Dotychczasowa wycena barku pozostaje ujawnioną referencją katalogową całych butelek, bez zmiany zasad.
- Pełny JSON v3 z historią i plikami, import v1/v2/v3, walidacja, podgląd, kopia przed zastąpieniem, potwierdzenie i kontrola nieaktualnego tokenu.
- Trwałe oczekujące operacje v3, synchroniczny SHA-256 wersji bazowej bez powielania jej całego JSON, wspólna blokada i odzysk. Nieaktualny edytor pozostawia formularz i szkic. Starsza karta nie nadpisuje v3.
- PL/EN i istniejący branding. Poprawiono propagację Escape/Tab w zagnieżdżonych dialogach: zamykany jest najwyższy dialog, fokus pozostaje we właściwym oknie.

Katalog nadal zawiera 638 wydań. Nie zmieniono ich ID, odmian, kodów, cen, fotografii ani klasyfikacji. Dawne testy integralności nadal sprawdzają dane.

## Zapis i migracja

Aktywny klucz to `dram.journal.v3`. Stare v2/v1 pozostają. Zamiary starszej aplikacji są bezpiecznie odzyskiwane przed migracją; jeżeli v3 już istnieje, starszy wariant jest udostępniany oddzielnie, bez zastępowania nowej kolekcji. Ponowny start i równoczesna inicjalizacja kart nie mnożą egzemplarzy. Niepowodzenie zapisu zachowuje wcześniejsze bajty. Szczegóły: [model](data-model-v3.md), [migracje](migrations.md), [metodologia finansowa](pricing-methodology.md).

W fazie 1 kolekcja nadal jest w localStorage, a IndexedDB służy do koordynacji blokady. Nowy protokół ogranicza koszt zamiarów, ale duże pliki nadal podlegają limitom przeglądarki. Przekroczenie limitu daje błąd i zachowany wariant, zamiast cichego nadpisania. Limity i granica bezpiecznej migracji są jawne w modelu.

## Wykonane testy

- `npm ci --cache /workspace/.npm-cache`: sukces. Domyślny cache w katalogu domowym był tylko do odczytu; zmieniono ścieżkę instalacji, bez obchodzenia kontroli TLS czy integralności pakietów.
- `npm test`: **72 testy, 72 zaliczone**, bez pominięć.
- `npm run build`: sukces.
- TypeScript `--noUnusedLocals --noUnusedParameters`: sukces.
- **13 zestawów E2E**, wszystkie zaliczone: podstawowy dziennik, barcode, marki, odkrywanie/wycena, skaner/życzenia, redesign, preferencje, audyt katalogu, journal, ostatnie 40 produktów, quality, nowe egzemplarze oraz nowe UI.
- **84 widoki**: 60 dotychczasowych oraz 24 nowe PL/EN, na szerokościach 320, 375, 390, 768, 1024 i 1440 px. Wybrane widoki sprawdzono axe WCAG A/AA; brak zgłoszonych naruszeń. Testy klawiatury i braku przewijania poziomego przeszły.
- Nowy E2E wykonał migrację 5/2, przeniesienie masowe do lokalizacji, zapis ceny i płynu, zdjęcia i PDF, konflikt dwóch kart, sprzedaż 40 EUR z opłatą 5 EUR i kosztem 25 EUR (wynik 10 EUR), pełny eksport i odtworzenie v3.
- W załadowanej karcie potwierdzono zapis lokalny po odcięciu sieci. Ponowny start offline nie jest wspierany bez service workera i pozostaje kryterium fazy 2.

Testy korzystają z izolowanych kontekstów przeglądarki i jawnych fixture, bez zmieniania rzeczywistych kolekcji. W szybkich regresjach obrazy zewnętrzne są zastąpione fixturą; nie jest to ponowny audyt ich dostępności. Pliki i źródła katalogowe nie zostały zmienione. Trzeci obowiązkowy zestaw `collection-e2e.py` dodano do istniejącego workflow publikacji.

## Ograniczenia i następne kroki

Nie uruchamiano Firefox/WebKit ani telefonów fizycznych; procedura jest w [testing.md](testing.md). Pełne IndexedDB, service worker, dashboard, import CSV/XLSX, konta/Supabase/RLS, synchronizacja urządzeń, historia cen, wykresy, Taste DNA, Passport PDF, Lens i udostępnianie są zadaniami kolejnych faz. Nie ma fikcyjnych przycisków ani nieaktywnej integracji przedstawianej jako działająca. Faza 1 nie wymaga zewnętrznego projektu ani sekretów.

W projekcie konfiguracji środowiska zapisano `install_script` (cache w `/workspace/.npm-cache`) i `start_skill` z istniejącym checkoutem oraz gotowością preview. Bieżąca instancja została przetestowana. Aktywacja tego projektu dla następnych środowisk wymaga przejrzenia i zapisania zmian w ustawieniach oraz publikacji środowiska; zapis projektu nie wykonuje automatycznie tych kroków.

## Pliki zmienione w całej fazie

<!-- phase-files:start -->
- `.github/workflows/deploy-pages.yml`
- `README.md`
- `docs/architecture.md`
- `docs/catalog-quality.md`
- `docs/data-model-v3.md`
- `docs/migrations.md`
- `docs/phase-1-report.md`
- `docs/pricing-methodology.md`
- `docs/privacy.md`
- `docs/reliability-and-catalog.md`
- `docs/roadmap.md`
- `docs/sync.md`
- `docs/testing.md`
- `package-lock.json`
- `package.json`
- `public/third-party-notices.txt`
- `src/App.tsx`
- `src/collection-finance.ts`
- `src/collection-model.ts`
- `src/collection-store.ts`
- `src/collection.ts`
- `src/components/BackupControls.tsx`
- `src/components/CellarInstances.tsx`
- `src/components/Primitives.tsx`
- `src/components/WhiskyDetails.tsx`
- `src/english.json`
- `src/journal-store.ts`
- `src/styles.css`
- `src/useJournal.ts`
- `tests/barcode-e2e.py`
- `tests/brands-e2e.py`
- `tests/catalog-audit-e2e.py`
- `tests/collection-e2e.py`
- `tests/collection-model.test.mjs`
- `tests/collection-ui-e2e.py`
- `tests/discovery-cellar-e2e.py`
- `tests/e2e.py`
- `tests/journal-e2e.py`
- `tests/live-smoke.py`
- `tests/preferences-e2e.py`
- `tests/quality-e2e.py`
- `tests/redesign-e2e.py`
- `tests/scanner-wishlist-e2e.py`
<!-- phase-files:end -->
