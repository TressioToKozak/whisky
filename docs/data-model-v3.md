# Journal v3 — faza 1

`Whisky` nadal opisuje wydanie. Jego ID oraz katalog 638 pozycji nie zmieniają się. `OwnedBottle` opisuje konkretny egzemplarz, a `BottleEvent` rzeczywistą zarejestrowaną operację użytkownika.

## Kolekcja

`CollectionJournal` zawiera `version: 3`, `custom`, `reviews`, `wishlist`, `barcodeLinks`, `ownedBottles`, `events`, `locations`. Pole `bottles` jest wyłącznie wyliczaną projekcją dla starszego interfejsu: stanowi sumę egzemplarzy `closed`/`open`. Walidator nie ufa zaimportowanym licznikom i zawsze wylicza je ponownie. Jedynym źródłem stanu są fizyczne egzemplarze.

## Egzemplarz

- `id`, `whiskyId`: trwałe ID egzemplarza i wydania.
- `status`: `closed`, `open`, `empty`, `sold`, `gifted`, `archived`.
- `purchase`: sposób pozyskania (`unknown`, `purchase`, `gift`), data, kwota, waluta EUR/PLN/GBP/USD lub `null`, miejsce. Brak kwoty to `null`, nie zero. Kwota wymaga waluty. Prezent nie ma kosztu zakupu.
- `sale`: opcjonalna rzeczywista transakcja z datą, kwotą brutto, opłatami i walutą. Nieznane opłaty nie są zerem.
- `openedAt`: jawnie podana data lub znany moment bieżącej operacji szybkiego otwarcia. Migracja zostawia `null`.
- `remainingMl` / `remainingPercent`: jedna miara albo obie `null`; nie przeliczamy ich przy nieznanej pojemności. Ml nie mogą przekraczać znanej pojemności wydania. Opróżnienie ustawia 0 ml.
- `bottleNumber`, `caskNumber`, `batch`, cztery stany zachowania, `locationId`, prywatne notatki.
- `attachments`: ID, rodzaj, nazwa i dane zdjęcia JPG/PNG/WebP albo dokumentu PDF. PDF wyłącznie jako dokument zakupu. SVG/HTML nie są obsługiwane. Walidowane są MIME, base64, nagłówek pliku i limity. Pliki nie są wysyłane do serwera.
- `createdAt` / `updatedAt`: znany czas zapisu w aplikacji lub `null` dla migracji. Nie są datami zakupu.

Szybkie zmniejszenie dawnego licznika wycofuje egzemplarze do `archived`, zaczynając od zamkniętych. Nie dopisuje sprzedaży, prezentu ani opróżnienia i nie usuwa metadanych. Można przywrócić status w edytorze. Zmiana liczby otwartych jest jawną korektą statusów. Fizyczne rekordy sprzedane, opróżnione, podarowane i wycofane nadal są w historii i kopii, ale nie w posiadanym stanie.

## Historia i lokalizacje

Zdarzenia zapisują czas operacji, rodzaj oraz poprzednie i nowe wartości zmienionych pól. Binarne załączniki nie są powielane w historii, tylko ich metadane. Migracja nie tworzy zdarzeń. Lokalizacje tworzą drzewo; rodzic musi istnieć, cykle i nadmierna głębokość są odrzucane. Przeniesienie masowe tworzy zdarzenie dla każdego ID. Usunięcie zajętej lokalizacji albo lokalizacji z dziećmi jest zablokowane. W historii ruchów zachowywane są ścieżki nazw.

## Limity fazy 1

Maksymalnie 999 posiadanych egzemplarzy jednego wydania, 100 000 rekordów w walidatorze v3, 200 000 zdarzeń, 4000 lokalizacji, 15 załączników po do 1 MB w UI. Rzeczywisty limit localStorage jest znacznie mniejszy i zależy od przeglądarki; przekroczenie nie nadpisuje danych. Migracja ilościowa powyżej 20 000 egzemplarzy jest zatrzymywana przed alokacją — wymaga fazy IndexedDB. To zabezpieczenie pamięci, nie usuwanie ani skracanie kolekcji. Limity i backend przechowywania zostaną ponownie ocenione w fazie 2.

## Backend i limity po fazie 2

Przenośny format pozostaje v3; schemat bazy ma niezależną wersję 1. W IDB binaria są poza roboczymi wierszami JSON. Odtworzenie kopii i zgodny snapshot interfejsu nadal składają pełny dokument w pamięci. Nie zwiększamy na ślepo limitów plików: UI 1 MB/pliku, 15/egzemplarz, JSON import 20 MB; CSV 5 MB i 20 000 wierszy. Limity rekordów powyżej pozostają aktualne, a bariera 20 000 dotyczy wyłącznie rozwijania dawnych ilości v1/v2. Duże v3 nie są obcinane.

Istniejące pliki w trwałych zamiarach są referencjami do bazy, więc kolejne edycje nie zużywają ponownie ich wielkości w localStorage. Pierwsze dodanie nowego pliku nadal wymaga miejsca na synchroniczne zabezpieczenie; błąd jest widoczny i nie udaje sukcesu. Rzeczywisty dostępny limit IDB zależy od przeglądarki, wolnego dysku i polityki usuwania danych. Nie deklarujemy nieograniczonej kolekcji.

Arkusz obejmuje ID egzemplarza, ID/nazwę/markę wydania, status, datę i kwotę/walutę zakupu, miejsce, lokalizację i notatki. Nie zawiera dokumentów, historii, degustacji, życzeń ani wszystkich pól kolekcjonerskich; służy do wymiany tabelarycznej. Eksport CSV chroni komórki zaczynające się od formuły apostrofem; XLSX używa typowanych liczb i inline strings, bez formuł. Import nie usuwa automatycznie apostrofu ochronnego, żeby nie zmieniać prywatnych notatek.
