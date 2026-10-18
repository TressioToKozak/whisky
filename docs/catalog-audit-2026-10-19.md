# Audyt katalogu — 19.10.2026

## Wynik

Katalog wzrósł z 541 do **579 pozycji**, zachowując wcześniejsze identyfikatory. Dodano markę Jameson z 18 wydaniami. Pozostałe dodatki: Chivas Regal 7, Bushmills 4, Ballantine’s 4, Ardbeg 2, Glenfiddich 2 i Jim Beam 1.

Przejrzano wszystkie jedenaście marek. Johnnie Walker i Jack Daniel’s miały już rozbudowane katalogi 253 i 122 wydań; w sprawdzonych bieżących ofertach nie potwierdzono odrębnych brakujących wydań. Dla Goldfinch sprawdzono aktualny sklep producenta: brakujące odsyłacze do Macallana 26 zwracały 404, a brandy Bisou nie jest whisky. Dla Toki nie dodano podobnie nazwanych rumów, piw i mikserów. Nie jest to deklaracja kompletności wszystkich historycznych etykiet.

Lista dodatków, powodów wykluczeń i zakresu poszczególnych marek: `data/catalog-expansion-2026-10-19.json`.

## Ceny

Sprawdzono każdą z 579 wycen:

- **317 cen sklepowych** potwierdzono ponownie na stronach źródłowych.
- **260 wycen aukcyjnych** sprawdzono przez pojedyncze zakończone sprzedaże i ponowne obliczenie median z zapisanych obserwacji.
- **2 ceny zgłoszone** (Sabrina Carpenter i Sweet Blend) pozostają jawnie niepotwierdzone niezależnie.

Kwoty źródłowe zgadzały się ze sprzedażami, ale kontrola pojemności i mocy wykryła niezgodne obserwacje w starszych medianach. Po odczytaniu opisów aukcji odzyskano 75 brakujących pojemności i skorygowano 18 kwot, licząc mediany wyłącznie z pasujących butelek. Ostatecznie 242 wyceny aukcyjne odpowiadają katalogowej pojemności i mocy, a 18 pozostaje wyłącznie referencjami. Są oznaczone „ref.” i wyłączone z wartości barku oraz życzeń. Dwie zgłoszone ceny użytkownika zachowują jawny status niepotwierdzony. Szczegóły i poprzednie kwoty: `data/price-capacity-corrections-2026-10-19.json`. Wykluczone obserwacje pozostają w dokumentacji, zamiast zostać usunięte. Cena pełnej butelki jest dobierana według dokładnego SKU. Przykład regresji: Bushmills 22 Boutique-y kosztuje w źródle £249,95 za 700 ml; widoczne na tej samej stronie £14,35 dotyczy próbki i nie jest używane.

Przeliczenia zagraniczne zachowują udokumentowany kurs z 16.10.2026 i wcześniejsze daty kursów tam, gdzie zostały zapisane. Data ponownego odczytu oferty nie jest datą kursu. Cena w UK jest oznaczona jako referencja zagraniczna, a wyprzedana oferta jako archiwalna. Wynik aukcji nie obejmuje wszystkich opłat i nie stanowi bieżącej wyceny rynkowej. Nie deklarujemy najniższej ceny w Holandii ani dostępności wszystkich butelek.

## Kody kreskowe

Baza wzrosła ze **113 kodów / 112 produktów do 178 kodów / 182 produktów**. To 31,43% katalogu; pozostałych 397 produktów nie przedstawiamy jako automatycznie rozpoznawanych.

Wszystkie pierwotne 113 przypisań ponownie odnaleziono w źródłach przy zgodnej pojemności. Wyszukano dodatkowe jawne EAN/UPC/GTIN w specyfikacjach i danych produktów. Odrzucono kody ograniczonego obiegu, niepoprawne cyfry kontrolne, próbki i inne pojemności. Dla stron z wariantami GTIN jest używany wyłącznie przy zgodnym SKU produktu.

Jeden kod może identyfikować więcej niż jedną etykietę lub beczkę. Przykład: EAN 5099873026045 występuje przy McLaren 2023 i 2024. Skaner pokazuje wybór, zamiast automatycznie wskazać pierwszą kartę; osobiste dopasowanie jest zachowywane po odświeżeniu.

Szczegóły dowodów: `data/barcode-audit.json`. Pokrycie każdego identyfikatora: `data/barcode-coverage.json`.

## Zdjęcia

Obejrzano **wszystkie 579 zdjęć**: 14 arkuszy dotychczasowych zdjęć, arkusz 38 nowych i 15 arkuszy prezentacji w przeglądarce. Sprawdzono butelkę, etykietę, opakowanie i przypisanie do wydania; dodatkowo odczytano strony źródłowe zdjęć.

Wszystkie 541 wcześniejszych oryginalnych plików zachowuje sumy SHA-256. Nowe 38 fotografii pobrano bezpośrednio od sprzedawców i zapisano ich źródła oraz sumy. Nie wygenerowano i nie przerysowano butelek ani etykiet.

Wspólne białe pole zdjęcia jest stosowane w katalogu, szczegółach i skanerze. Wybrane korekty są wyłącznie prezentacyjne:

- Ardbeg 25: kadr skupia się na autentycznej butelce i pudełku, pomijając promocyjny fartuch.
- Unaged Tennessee Rye: maska obrysu usuwa szary papier poza butelką, zachowując oryginalne szkło i etykietę.
- A Song of Ice / Fire: korekta niewielkiego przechylenia aparatu o 1,4°. Skośnie wydrukowane etykiety pozostają skośne.
- Old No.2: odwrócona etykieta jest widoczna na autentycznej butelce aukcyjnej. Nie odwracamy ani nie przerysowujemy napisu.

Zdjęcia historyczne nadal mają różną rozdzielczość, naturalne cienie i perspektywę. Jednolite pole prezentacji nie oznacza wyretuszowania każdej fotografii do identycznych pikseli tła. Wydania rozpoznawalne po pudełku zachowują je na zdjęciu. Przeglądarki bez object-view-box pokazują pełen oryginalny kadr.

Znak Jamesona wyizolowano edytorem obrazu z oryginalnej etykiety na przezroczystym tle. Jest opracowaniem fotograficznego znaku, nie oficjalnym plikiem wektorowym. Pochodzenie: `data/brand-sources.json`.

## Dowody i testy

`data/catalog-audit-2026-10-19.json` zawiera osobny rekord każdej karty: zdjęcie, SHA-256, wynik kontroli ceny i kody. `data/source-audit-2026-10-19.json` zapisuje 1285 sprawdzonych adresów, z czego 1282 odpowiedziały poprawnie; trzy niedostępne kandydatury nie zostały dodane. Same odpowiedzi HTTP nie są traktowane jako potwierdzenie ceny lub produktu — fakty sprawdzano w specyfikacji, tytule, ofercie i wynikach aukcji.

Testy: model, fotografie i źródła; kompilacja TypeScript/Vite; scenariusze marek, wyszukiwania, wyceny, degustacji, skanera, życzeń i nowego Jamesona; rzeczywisty współdzielony kod McLaren; 60 widoków w szerokościach 320–1440 px, klawiatura i axe-core WCAG A/AA. Testy kamer wykonano w Chromium ze strumieniem obrazu, bez fizycznego iPhone’a/Androida. Dziennik `dram.journal.v1` pozostaje zgodny.
