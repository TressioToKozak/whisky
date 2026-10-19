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
