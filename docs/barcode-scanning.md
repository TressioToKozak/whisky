# Dodawanie butelki z kodu kreskowego

W barku wybierz **Skanuj butelkę**, albo ikonę kodu w górnym pasku. Włącz aparat, wybierz zdjęcie kodu lub wpisz EAN/UPC-A. Po odczycie sprawdź nazwę, pojemność i etykietę, a następnie potwierdź dodanie jednej butelki. Kolejny potwierdzony skan zwiększa ilość istniejącej pozycji; zachowuje oznaczenie otwarcia i degustacje, usuwa pozycję z życzeń i aktualizuje wartość barku.

## Dlaczego potrzebne jest potwierdzenie

GTIN identyfikuje produkt handlowy. Nie koduje nazwy, wieku, ceny ani zawartości whisky. Rynki, pojemności, zestawy i opakowania mogą mieć osobne kody; zmiana etykiety lub partii nie zawsze oznacza nowy GTIN. Dlatego nie przypisujemy whisky na podstawie prefiksu producenta, SKU sklepu, podobnej nazwy ani samej marki. Różna pojemność nie jest automatycznie zamieniana na butelkę katalogową.

Indeks zawiera **113 kodów dla 112 pozycji** (poprzednio 108 / 107), potwierdzonych w specyfikacjach produktów Drankgigant i Topdrinks. Nie oznacza to automatycznego rozpoznawania wszystkich 541 pozycji ani wszystkich wariantów ich opakowań. `src/barcodes.json` zawiera identyfikator whisky, pojemność, źródło i datę; `data/barcode-audit.json` zachowuje odczytane wartości źródłowe. Kody z inną publikowaną pojemnością są odrzucane. Wszystkie kody mają poprawną długość i cyfrę kontrolną.

Nieznany kod można dopasować do konkretnej whisky i pojemności z katalogu albo powiązać z nowym własnym wpisem. Potwierdzone dopasowanie można zapamiętać. Jeśli indeks kiedyś będzie zawierał kilka wydań tego samego kodu, aplikacja pokaże wybór, zamiast brać pierwszy wynik. Przycisk „To inna whisky” pozwala poprawić dopasowanie. Zapamiętany wybór ma pierwszeństwo przy kolejnych skanach.

Raport pokrycia każdego z 541 identyfikatorów: `data/barcode-coverage.json`. Nowe dowody i ograniczenia opisano w [ui-simplification.md](ui-simplification.md).

## Aparat i zdjęcia

Dekoder ZXing działa w JavaScript; nie wymaga `BarcodeDetector`, którego dostępność różni się między Safari/iOS i Chrome/Android. Biblioteka pobiera się z własnego hostingu dopiero po uruchomieniu aparatu lub wybraniu zdjęcia. Obsługiwane symbole: EAN-13, EAN-8, UPC-A i UPC-E. UPC-E jest rozwijany do UPC-A na podstawie odczytanego formatu — nie jest mylony z ośmiocyfrowym EAN. Pole ręczne przyjmuje EAN, UPC-A oraz pełny GTIN-14. Skaner aparatu nie odczytuje kodów QR ani ITF-14 z kartonów zbiorczych.

Aparat wymaga HTTPS i zgody przeglądarki. Jest włączany przyciskiem, preferuje tylny obiektyw i nie żąda mikrofonu. Ustawia ciągły autofocus wyłącznie wtedy, gdy kamera zgłasza taką możliwość; odrzucenie tej opcjonalnej wskazówki nie blokuje aparatu. Po 12 sekundach bez wyniku podpowiada poprawienie kadru albo użycie zdjęcia/numeru. `playsInline` i wyciszenie wspierają odtwarzanie podglądu na iOS. Odmowa zgody, brak aparatu i zajęty aparat mają komunikaty oraz alternatywy: zdjęcie albo numer. Zadbaj o ostrość, oświetlenie i cały kod w kadrze; refleksy i krzywizna szkła utrudniają odczyt. Zdjęcia: JPG/PNG/WebP, maksymalnie 10 MB.

Odczyt z kamery wymaga dwóch zgodnych, poprawnych obserwacji w jednej sesji, po czym skaner się zatrzymuje. Klatki i zdjęcia nie są wysyłane na serwer ani do zewnętrznej bazy produktów. Samo odczytanie kodu nie zmienia barku. Podwójne kliknięcie potwierdzenia ma blokadę; ilość nie przekracza 999. Aparat jest wyłączany po wyniku, zamknięciu okna, przejściu do innej karty aplikacji i również wtedy, gdy zgoda dotrze dopiero po zamknięciu skanera.

## Zapis i zgodność

Format `dram.journal.v1` zachowuje wersję 1. Opcjonalne `barcodeLinks` rozszerza dotychczasowy zapis bez migracji ani zmiany identyfikatorów. Walidacja obejmuje kanoniczny GTIN-14, unikatowość kodów, istnienie whisky i limit 4000 powiązań. Stare dzienniki bez tego pola pozostają poprawne. Usunięcie własnej whisky usuwa również jej powiązania kodów. Anulowanie skanu nie dodaje whisky.

## Sprawdzenie

- `npm test`: sumy kontrolne, równoważność UPC-A/EAN-13, rozwijanie UPC-E, niejednoznaczne dopasowania, zgodność pojemności i dowodów, ilości, granice oraz zgodność starych zapisów.
- `npm run build`: typy, budowa produkcyjna i osobny pakiet dekodera.
- `DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/barcode-e2e.py`: rzeczywisty odczyt pikseli PNG i strumienia wideo z obrazu EAN-13, potwierdzanie, ilości, podwójny klik, nieznany kod, nowy wpis i jego usunięcie, trwałość dopasowań, odmowa aparatu, zatrzymanie strumienia oraz opóźniona zgoda. Wideo testowe to prawdziwy `MediaStream` z płótna; wynik dekodera nie jest podmieniany.

Testy automatyczne wykonano w Chromium. Nie zastępują testu ostrości i uprawnień na fizycznym telefonie iPhone/Android. Plik `tests/fixtures/barcode-ean13.png` jest wygenerowanym symbolem EAN-13 5010327324333 dla źródłowo potwierdzonego Glenfiddich 14 Bourbon Barrel Reserve, a nie zdjęciem butelki. Informacje o licencjach dekodera: `public/barcode-third-party-notices.txt`.
