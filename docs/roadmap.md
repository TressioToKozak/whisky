# Dram 2.0 — plan kontynuacji

Bazą jest `ddbcbb3`. Projekt realizujemy fazami, bez deklarowania ukończenia całego Dram 2.0 po fazie 1.

## Faza 1 — fundament kolekcjonerski

Implementacja: fizyczne egzemplarze v3, migracja v1/v2, zachowane stare klucze, zgodne liczniki, sześć statusów z bezpiecznym wycofaniem, historia rzeczywistych zmian, zakupy/sprzedaże, napełnienie, numery i stany zachowania, lokalizacje z masowym przenoszeniem, prywatne zdjęcia i dokumenty, pełny backup v3 oraz rozdzielenie kosztów i referencji katalogowych. Istniejący wygląd i nawigacja pozostają bazą.

Wyniki testów i ograniczenia: `testing.md`, `data-model-v3.md`, `migrations.md`. Faza 1 nie wdraża całego systemu offline ani chmury.

## Faza 2 — niezawodność i UX

Wdrożono IndexedDB z sześcioma store, indeksami, transakcyjnym zapisem i atomową migracją ze starym JSON oraz SHA kopii. Testy obejmują dwie karty, przerwanie, quota, korupcję, odzyskanie zamiarów i pliki. Binaria są osobnymi rekordami; zamiary istniejących plików używają referencji. Pełny backup pozostaje zgodnym v3.

Dostępne są mapowany import CSV z podglądem/błędami/duplikatami, dołączanie i potwierdzane zastąpienie z kopią, eksport CSV/XLSX chroniony przed formułami. Ekran Start, onboarding, jasny/ciemny motyw, indeks wyszukiwania, kody i ostrożna tolerancja literówek zachowują wcześniejszy branding.

Service worker zapisuje wersjonowany shell z modułami i katalogiem, bez hurtowego pobierania zdjęć. Pełny restart offline i zapis po kolejnym restarcie są testowane. Aktualizacja jest jawna, respektuje edytory i zapisy oraz nie przeładowuje innych kart. CI obejmuje Chromium i osobne bramki Firefox/WebKit; brak dostępu do urządzeń fizycznych opisuje procedura `testing.md`.

Świadome ograniczenie: interfejs/backup nadal składa pełny v3 w pamięci. Nie zwiększono nieodpowiedzialnie limitów zdjęć i JSON. Stronicowane odczyty i całkowite wyeliminowanie danych plików z runtime snapshotu wymagają kolejnej zgodnej optymalizacji, opisanej w `architecture.md`; nie są warunkiem rozpoczęcia projektu backendu, ale pozostają ważne przed dużymi archiwami zdjęć. Żaden obecny limit nie powoduje cichego obcinania danych.

Raport i wyniki: `phase-2-report.md`.

## Faza 3 — konta i synchronizacja

Dopiero po fazie 2: Supabase/PostgreSQL, SQL/RLS, autoryzacja, prywatny storage, wersjonowane operacje, kolejka offline, konflikty bez last-write-wins, eksport i usuwanie konta. Wymaga zewnętrznego projektu i konfiguracji. Szczegóły `sync.md`.

## Faza 4 — funkcje premium

Historia prawdziwych obserwacji cen i udokumentowanych kursów; oddzielone detal/aukcje; wykresy i alerty tylko przy nowych dowodach; raporty zakupów i wydatków. Rozszerzone skale degustacji, statystyczne Taste DNA z uzasadnieniami i małą próbą. Passport oraz prywatny PDF bez deklaracji autentyczności. Opcjonalne QR wyłącznie z losowym ID, bez danych prywatnych.

## Faza 5 — Lens i udostępnianie

Opcjonalne rozpoznawanie etykiet za bezpiecznym backendem, świadoma zgoda na wysyłkę i potwierdzanie kandydatów z rzeczywistego katalogu. Bez dostawcy nie pokazywać fikcyjnej funkcji AI. Publiczne profile/udostępnianie wymagają osobnego modelu prywatności i jawnej listy pól; nigdy automatycznie dokumenty, koszty czy lokalizacje. Rozbudowa katalogu wyłącznie ze zweryfikowanymi źródłami, audytem i kontrolą duplikatów.
