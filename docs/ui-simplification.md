# Skaner i uproszczenie Dram — 18.10.2026

## Przyczyna i naprawa

Red Label `jw-004` był obecny w katalogu, ale nie miał powiązania EAN. Dekoder działał, a komunikat nieznanej butelki zacierał różnicę między nieodczytanym symbolem a brakiem przypisania. EAN **5000267014203** jest jawnie podany w specyfikacji Drankgigant dla Red Label 70 cl / 40%. Zapis kanoniczny: `05000267014203`. Nie przypisujemy tego kodu wszystkim wariantom etykiet ani pojemnościom.

Dodano pięć źródłowo potwierdzonych przypisań:

| Produkt | EAN / UPC | Pojemność |
| --- | --- | --- |
| Johnnie Walker Red Label | 5000267014203 | 700 ml |
| Johnnie Walker Blue Label | 5000267195612 | 700 ml |
| Jack Daniel’s Gentleman Jack | 5099873038758 | 700 ml |
| Jack Daniel’s Tennessee Apple | 5099873017623 | 700 ml |
| Jack Daniel’s Single Barrel | 082184088654 | 700 ml |

Źródła, odczytane wartości i SHA-256 pobranych dokumentów: `data/barcode-audit.json`. Pliki źródłowe zachowano podczas badania w katalogu roboczym poza repozytorium. Każde przypisanie przechodzi walidację GTIN i zgodności pojemności. Standardowe nazwy sprawdzono w nagłówkach i specyfikacjach stron, zamiast dobierać kod według samej marki.

## Pokrycie

Raport `data/barcode-coverage.json` obejmuje **wszystkie 541 produktów** wraz z identyfikatorem, pojemnością, źródłem katalogowym, kodami lub jawnym statusem braku potwierdzonego kodu. Pokrycie wzrosło z **108 kodów / 107 produktów do 113 kodów / 112 produktów (20,70%)**. Pozostałe 429 produktów nie ma zweryfikowanego przypisania. Raport uwzględnia popularne produkty wszystkich wymienionych marek; wiele podstawowych pozycji Jim Beam, Ballantine’s, Chivas, Glenfiddich, Bushmills, Ardbeg i Toki miało już kody.

Przegląd nie jest deklaracją obsługi każdej historycznej butelki. Niektóre dodatkowe strony zwracały HTTP 403, 404 lub 429; nie stanowi to dowodu istnienia ani braku EAN. Tennessee Fire i Honey pozostają bez potwierdzonych kodów. Kandydat Honey 2000250820104 został odrzucony: zaczyna się od 20 (ograniczony obieg), więc specyfikacja sklepu nie potwierdza globalnego kodu na butelce. Nie dodano kodów z przypuszczeń ani obcego API o niepewnej jakości. Własne dopasowania mają pierwszeństwo i pozostają zapisywane w `dram.journal.v1`.

## Proces i aparat

Odczyt → walidacja → osobiste przypisanie → baza lokalna → zdjęcie, nazwa i pojemność → potwierdzenie. Powtarzające się klatki nie zmieniają barku. Ponowne potwierdzenie zwiększa ilość istniejącej pozycji. Nieznany poprawny kod proponuje wyszukanie istniejącej whisky; nowy wpis jest osobną opcją. Wszystkie wyszukiwarki korzystają z `matchesWhisky`, które toleruje połączone słowa, kolejność, apostrofy i polskie znaki.

Autofocus jest opcjonalny i sprawdzany w możliwościach kamery. Pozostały tylna kamera, playsInline, brak mikrofonu, blokada podwójnego potwierdzenia i zatrzymanie strumienia po wyniku, ukryciu strony lub zamknięciu. Komunikaty rozróżniają brak odczytu, błędny numer i poprawny kod bez przypisania.

## Mniej elementów

Start: logo, jedna wyszukiwarka, kompaktowe marki, jeden skrót do barku. Usunięto statystyki i ostatnią degustację. Karty: zdjęcie, nazwa, pojemność/wiek, cena, jedna akcja. Życzenia, oceny, redukcja ilości i otwarcie butelki są w szczegółach. W barku zachowano szybkie dodanie sztuki; filtry stanu są pod przyciskiem Filtry. Skaner ma jedno stałe wejście w nagłówku. Własny wpis jest linkiem pod markami, bez eksponowanego przycisku w nagłówku. Sekcję „Źródła” usunięto, ale źródłowe dane i pochodzenie ceny zachowano. Opis i historia degustacji są zwijane.

Wartość życzeń to suma cen jednej butelki każdej zapisanej whisky, niezależna od filtrów i stanu barku. Brakujące wyceny są jawnie wyłączone z sumy. Nie zmieniono katalogu, zdjęć, identyfikatorów ani schematu dziennika.

## Testy i ograniczenia

`npm test`, `npm run build`, dotychczasowe scenariusze e2e, marek, barku i skanera. `tests/scanner-wishlist-e2e.py` dodatkowo sprawdza rzeczywiste piksele EAN Red Label, potwierdzanie i ilości, nieznany kod → istniejący produkt → zapis → ponowny odczyt po odświeżeniu, połączone nazwy oraz sumę życzeń z filtrem, brakującą ceną i przeniesieniem do barku. PNG w `tests/fixtures/barcode-red-label.png` jest wygenerowanym symbolem zweryfikowanego EAN, nie zdjęciem butelki.

`tests/redesign-e2e.py` sprawdza 60 widoków w sześciu szerokościach 320–1440 px, rozmiary tekstu i interakcji, brak overflow, kadrowanie logotypów, jedną akcję na karcie, klawiaturę, reduced motion i opcjonalnie axe-core WCAG A/AA.

Dekodowanie wideo przetestowano na prawdziwym MediaStream z płótna; wynik ZXing nie jest podmieniony. Nie testowano fizycznej kamery iPhone/Android, autofocusu konkretnego obiektywu, refleksów na szkle ani systemowego okna uprawnień tych telefonów. Emulacja Chromium ich nie zastępuje.
