# Prywatność i bezpieczeństwo — faza 1

Dane kolekcji, notatki, ceny zakupu, lokalizacje, prywatne fotografie i dokumenty nie są wysyłane na serwer Dram. Brak kont, publicznych profili i telemetrii. Publiczny katalog nadal korzysta z istniejących zewnętrznych źródeł zdjęć; takie żądania ujawniają dostawcy standardowe dane połączenia. Nie dołączają prywatnych dokumentów ani danych egzemplarza.

Dane localStorage nie są szyfrowanym sejfem. Każdy z dostępem do profilu przeglądarki lub urządzenia może je odczytać. Pełny JSON zawiera także dokumenty i prywatne notatki; użytkownik powinien przechowywać go odpowiednio bezpiecznie. Czyszczenie danych witryny może usunąć kolekcję. Stare klucze pozostają jako zabezpieczenie migracji, więc ręczne usunięcie tylko jednego klucza nie usuwa wszystkich lokalnych kopii.

Walidacja importu ogranicza rozmiar i strukturę, odrzuca nieznane ID, nieprawidłowe kwoty, daty, cykle lokalizacji i duplikaty. Pole licznika nie steruje v3. React wyświetla notatki jako tekst; brak `dangerouslySetInnerHTML`. Załączniki dopuszczają obrazy rasterowe i PDF z nagłówkami, bez SVG/HTML. PDF jest pobierany na żądanie, bez osadzania jako aktywnej zawartości. Historia nie powiela binariów. Eksporty i dokumenty pozostają prywatne; brak publicznych linków.

Odcisk SHA-256 służy wyłącznie do porównania wersji oczekującego zapisu; nie jest szyfrowaniem danych. Biblioteka `@noble/hashes` ma licencję MIT, zachowaną w `public/third-party-notices.txt`.

Nie dodano sekretów ani kluczy API. Dotychczasowe adresy zdjęć i źródeł pozostają HTTPS; nie zmieniono plików ani praw do fotografii i fontów. Zachowano deklarację pełnoletniości. Aplikacja dokumentuje prywatne zakupy i sprzedaże; nie realizuje transakcji ani marketplace.

Usuwanie pojedynczego własnego wydania pozostaje jawną, potwierdzaną operacją obejmującą jego dane. Zwykłe zmniejszenie liczby butelek archiwizuje fizyczny rekord, zamiast usuwać historię. Pełne usuwanie konta, retencja backendu i udostępnianie są zadaniami następnych faz, bez aktywnego backendu w tej iteracji.
