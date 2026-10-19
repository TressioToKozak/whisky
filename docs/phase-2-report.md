# Faza 2 — raport wykonania

Bazą jest `60060dd`. Nie wdrożono kont, serwera synchronizacji, AI Lens ani fikcyjnych danych portfolio. Katalog zachowuje 638 ID, fotografie, opisy, ceny i kody; testy zgodności nadal przechodzą.

## Zachowanie aplikacji

- Aktywna kolekcja w IndexedDB: atomowa migracja, SHA oryginalnej kopii, osobne rekordy/binaria, indeksy, konflikty i bezpieczna naprawa z JSON. Stary v3/v2/v1 pozostaje zachowany. Błąd/quota nie udaje sukcesu. Istniejące pliki nie są ponownie kopiowane do synchronicznych zamiarów.
- Start z licznikami, orientacyjną wartością katalogową, ostatnimi znanymi datami i pustym stanem. Nawigacja nadal zapewnia Odkrywaj, Barek, Życzenia i Oceny. Motywy jasny/ciemny, niezależny język/region, wyszukiwanie po kodzie oraz literówkach dopiero przy braku ścisłych wyników.
- Import CSV: mapowanie kolumn, podgląd, błędne wiersze, jednoznaczne wydania, waluty i duplikaty. Dołączenie lub potwierdzane zastąpienie fizycznych rekordów, automatyczne pobranie pełnego JSON przed zapisem, token wersji. CSV/XLSX eksportują po jednym wierszu na egzemplarz i chronią przed formułami.
- Prawdziwy offline po restarcie: wersjonowany shell, moduły leniwe, katalog, fonty i logotypy. Bez hurtowego pobierania zdjęć. Jawna aktualizacja, weto otwartego edytora w drugiej karcie i przeładowanie tylko wybranej karty. Starszy shell nie jest usuwany spod innych kart.

## Walidacja lokalna

81 testów Node: wszystkie przeszły. Build i TypeScript z `noUnusedLocals/noUnusedParameters`: zaliczone. Pełne 14 dotychczasowych i nowych zestawów E2E przeszło na systemowym Chromium; dodatkowy piętnasty zestaw rzeczywistej aktualizacji service workera również przeszedł.

Nowe testy obejmują przerwaną migrację i brak markera, dwie karty, quota podczas zapisu, niezgodny SHA i naprawę, referencje załączników, import i duplikaty, CRC ZIP/XML w XLSX, PL/EN, sześć szerokości 320–1440 px, obie palety i axe WCAG A/AA, wyszukiwanie kodów/literówek, zamknięcie wszystkich stron przed odcięciem sieci oraz edycję i kolejny restart offline. Test aktualizacji używa dwóch rzeczywistych rewizji SW i niezapisanego formularza w drugiej karcie.

Wyniki robocze są w `/tmp/dram-phase2/` (logi i zrzuty). CI zawiera obowiązkowe bramki Chromium, Firefox i WebKit; rzeczywisty wynik dla publikowanego commitu należy sprawdzić w workflow. Lokalny proxy blokował pobranie dwóch dodatkowych silników (403), a próba zgody została przerwana. Nie deklarujemy lokalnych wyników Firefox/WebKit ani testu fizycznego iPhone/Android. Procedura telefonów jest w `testing.md`.

## Ograniczenia

IDB oddziela binaria od roboczych wierszy na dysku, ale zgodny runtime snapshot i pełny backup nadal składają v3 w pamięci. To nie jest jeszcze całkowicie stronicowane archiwum dowolnej wielkości. Limity 1 MB/pliku, 15 załączników/egzemplarz i 20 MB importu JSON pozostają; nowy plik wymaga miejsca na synchroniczne zabezpieczenie. CSV nie zastępuje pełnej kopii dokumentów/historii. Nieznane ceny, koszty i daty nie są dopisywane. Dane jednego profilu przeglądarki nie synchronizują się z innym urządzeniem.

Główne moduły: `indexed-collection.ts`, `tabular.ts`, `Dashboard.tsx`, `TabularControls.tsx`, `OfflineStatus.tsx`, plugin offline. Dokumentacja: architektura, model v3, migracje, prywatność, synchronizacja, metodologia cen i roadmapa.
