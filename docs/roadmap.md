# Dram 2.0 — plan kontynuacji

Bazą jest `ddbcbb3`. Projekt realizujemy fazami, bez deklarowania ukończenia całego Dram 2.0 po fazie 1.

## Faza 1 — fundament kolekcjonerski

Implementacja: fizyczne egzemplarze v3, migracja v1/v2, zachowane stare klucze, zgodne liczniki, sześć statusów z bezpiecznym wycofaniem, historia rzeczywistych zmian, zakupy/sprzedaże, napełnienie, numery i stany zachowania, lokalizacje z masowym przenoszeniem, prywatne zdjęcia i dokumenty, pełny backup v3 oraz rozdzielenie kosztów i referencji katalogowych. Istniejący wygląd i nawigacja pozostają bazą.

Wyniki testów i ograniczenia: `testing.md`, `data-model-v3.md`, `migrations.md`. Faza 1 nie wdraża całego systemu offline ani chmury.

## Faza 2 — niezawodność i UX (następna)

1. Dodać bazę IndexedDB z osobnymi store `metadata`, `ownedBottles`, `events`, `attachments`, `locations`, `pendingOperations`; indeksy wydania, statusu, lokalizacji i daty zakupu.
2. Przetestować atomową migrację v3 localStorage do IDB z markerem zakończenia, SHA kopii, równoczesnym startem dwóch kart, brakiem miejsca i przerwaniem; dopiero po potwierdzeniu aktywować nowy backend.
3. Oddzielić binaria od JSON w pamięci roboczej i zwiększyć bezpieczne limity dużych kolekcji. Zachować pełny przenośny backup.
4. Import CSV z mapowaniem, podglądem i duplikatami, bez udawania znajomości formatów konkurencji; CSV/XLSX eksport z ochroną przed formułami.
5. Dashboard z prawdziwymi licznikami i empty state, tryb jasny, dalsze usprawnienia wyszukiwania i małe moduły ładowane na żądanie. Zachować istniejące dynamiczne marki i źródła.
6. Service worker: cache wersjonowanego shell i podstawowego katalogu, bez masowego pobierania zdjęć; kontrolowana aktualizacja bez przeładowania podczas zapisu. Test odcięcia sieci i ponownego startu zainstalowanej aplikacji.
7. Testy Safari/WebKit i Firefox oraz instrukcja urządzeń fizycznych.

## Faza 3 — konta i synchronizacja

Dopiero po fazie 2: Supabase/PostgreSQL, SQL/RLS, autoryzacja, prywatny storage, wersjonowane operacje, kolejka offline, konflikty bez last-write-wins, eksport i usuwanie konta. Wymaga zewnętrznego projektu i konfiguracji. Szczegóły `sync.md`.

## Faza 4 — funkcje premium

Historia prawdziwych obserwacji cen i udokumentowanych kursów; oddzielone detal/aukcje; wykresy i alerty tylko przy nowych dowodach; raporty zakupów i wydatków. Rozszerzone skale degustacji, statystyczne Taste DNA z uzasadnieniami i małą próbą. Passport oraz prywatny PDF bez deklaracji autentyczności. Opcjonalne QR wyłącznie z losowym ID, bez danych prywatnych.

## Faza 5 — Lens i udostępnianie

Opcjonalne rozpoznawanie etykiet za bezpiecznym backendem, świadoma zgoda na wysyłkę i potwierdzanie kandydatów z rzeczywistego katalogu. Bez dostawcy nie pokazywać fikcyjnej funkcji AI. Publiczne profile/udostępnianie wymagają osobnego modelu prywatności i jawnej listy pól; nigdy automatycznie dokumenty, koszty czy lokalizacje. Rozbudowa katalogu wyłącznie ze zweryfikowanymi źródłami, audytem i kontrolą duplikatów.
