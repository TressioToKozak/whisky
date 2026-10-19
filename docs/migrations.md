# Migracje i odzyskiwanie

Faza 1 używa `dram.journal.v3`. Klucze `dram.journal.v2` i `dram.journal.v1` nie są usuwane. Poprzedni format i testy jego walidacji pozostają obsługiwane.

1. Nowa aplikacja najpierw odzyskuje trwałe zamiary poprzedniej wersji v2 pod istniejącą wspólną blokadą.
2. Odczytuje v3 albo najnowszy dostępny v2/v1. V1 jest normalizowany dotychczasowym walidatorem do v2.
3. V2 `quantity: 5, openedCount: 2` tworzy pięć egzemplarzy z deterministycznymi ID `migrated:<wiersz>:<numer>`, dwa otwarte. V1 `opened: true` oznacza jeden otwarty egzemplarz, zgodnie z poprzednią migracją.
4. Daty zakupów, koszty, waluty, pozostały płyn, stany zachowania i czasy utworzenia pozostają nieznane. Nie tworzy się historycznych zdarzeń.
5. Pod blokadą następuje ponowny odczyt i pojedynczy zapis kompletnego v3. Ponowna migracja tego samego wejścia daje identyczne ID; walidacja już istniejącego v3 nie tworzy kolejnych egzemplarzy.
6. Błąd limitu miejsca pozostawia poprzednie bajty. Możliwy jest eksport zachowanego zapisu albo nowej pełnej kopii z migracją. Duża kolekcja może wymagać fazy IndexedDB; nie obchodzimy limitu usuwaniem starej kopii.

Starsza karta zapisuje wyłącznie stary klucz. Nie może nadpisać aktywnego v3; aplikacja sygnalizuje takie zmiany i oferuje ich wariant do pobrania. Nie scala ich automatycznie z nowszymi egzemplarzami, bo nie zna ich tożsamości.

Nowe zamiary używają `dram.journal.pending.v3.*`. Zamiast powielać pełny poprzedni JSON, przechowują jego SHA-256 oraz oczekiwany SHA-256; samo wykonywanie zapisów nadal porównuje dokładne bajty pod blokadą. Odzyskiwanie weryfikuje odcisk przed zapisem. Obsługiwane są także wcześniejsze zamiary z pełnym poprzednim JSON. To ogranicza koszt miejsca bez usuwania starej kopii. Pozostaje dotychczasowa synchroniczna ochrona przed odświeżeniem przed uzyskaniem blokady. Zmiana egzemplarza i jej zdarzenia są jedną operacją. Po przerwaniu zgodny zamiar jest odtwarzany, nowszy zapis zatrzymuje sprzeczny wariant. Edytor dodatkowo porównuje oryginalny egzemplarz z aktualnym, a formularz zachowuje niezapisany szkic.

Backup eksportuje pełne v3 z dokumentami i historią. Import v1/v2 migruje, v3 waliduje. Podgląd, pobranie obecnej kopii, anulowanie, jawne potwierdzenie i token wersji nadal chronią zastąpienie kolekcji. Żadne potwierdzenie sukcesu nie wyprzedza zapisu.

Powrót do starego kodu pokazuje dawny zapis v2, bez nowych zmian v3. Nie jest to automatyczny downgrade aktualnej kolekcji. Najpierw należy pobrać aktualny pełny JSON. Nie usuwać ręcznie kluczy w celu migracji użytkownika.

## Faza 2: v3 localStorage → IndexedDB

Aktywna aplikacja używa teraz `dram-collection`, wersja 1. Dawny klucz v3 nie jest aktualizowany ani usuwany; v2/v1 również pozostają. Przed migracją odzyskiwane są wcześniejsze trwałe zamiary, także poprzedniej wersji aplikacji.

Przy pierwszym starcie pojedyncza transakcja zapisuje wszystkie metadane, egzemplarze, zdarzenia, lokalizacje i binaria oraz marker `migration-v3` z `complete`, dokładnym źródłowym JSON, SHA-256 i czasem migracji. Jest to czas migracji, nie zakupu. Sukces jest zgłaszany dopiero po zatwierdzeniu. Dwie karty są serializowane przez IDB; druga czyta zatwierdzoną bazę, nie migruje ponownie. Przerwanie/quota cofa wszystkie store i marker. Ponowne uruchomienie ponawia migrację ze starych, zachowanych bajtów.

Kolejność rekordów jest jawna w metadanych. Odtworzenie projekcji liczników następuje po tej kolejności, przed kontrolą SHA. Inny porządek kluczy IDB nie tworzy fałszywego konfliktu ani nie zmienia zawartości kopii.

Po aktywacji IDB zmiana dawnego v3 przez starszą kartę jest kwarantannowana, bez nadpisania bazy. Starszy poprawny wariant można pobrać osobno. Uszkodzone metadane, brak pliku, niezgodny SHA lub częściowa baza blokują zwykłe zapisy; aplikacja nie przełącza się automatycznie na przestarzały localStorage. Jawne przywrócenie zwalidowanego JSON może naprawić bazę. Kopia migracyjna pozostaje zachowana.

Zamiary nowych zapisów mogą zawierać `dram-binary:<sha>` zamiast ponownie kopiować zapisany plik. Start najpierw odczytuje binaria IDB i dopiero potem odtwarza zamiary. Pliki potrzebne przez oczekujące konflikty pozostają dostępne, nawet jeśli bieżący egzemplarz został zmieniony/usunięty. Po usunięciu zamiaru sprząta je następny zapis. To wewnętrzny format odzyskiwania, nie format przenośnego backupu; pełny eksport JSON zawsze zawiera dane plików.

CSV nie jest pełnym backupem. Import mapuje kolumny, wymaga jednoznacznego istniejącego wydania, podaje błędne numery wierszy i pomija duplikaty ID. Bez ID używa deterministycznego odcisku wiersza; dwa identyczne wiersze nie oznaczają automatycznie dwóch egzemplarzy. Tryb dołączania zachowuje stare rekordy; zastąpienie usuwa stare egzemplarze, ich dokumenty i historię, zachowując degustacje, życzenia i własne wydania. Oba tryby wymagają podglądu, checkboxa, automatycznego pobrania pełnej kopii przed zapisem i niezmienionego tokenu wersji.

Jawne importy pełnych kopii powyżej 2 MB używają atomowej transakcji IDB bez dodatkowego kopiowania całego pliku do synchronicznego zamiaru. Użytkownik posiada już plik źródłowy, a po przerwaniu pozostaje albo stan sprzed importu, albo kompletnie zatwierdzony import. Bez potwierdzonego sukcesu można ponowić import z tego samego pliku. Taki import nie jest automatycznie wznawiany po zamknięciu karty; zwykłe edycje i małe importy zachowują odzyskiwanie zamiarów. Dzięki temu pełny backup mieszczący się w limicie 20 MB nie wymaga drugiej dużej kopii w localStorage.
