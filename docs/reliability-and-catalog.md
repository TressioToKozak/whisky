# Niezawodność dziennika i rozbudowa katalogu

Aktualizacja 19.10.2026 po rozszerzeniu „Inne”. Poprzednie audyty pozostają historycznymi migawkami. Bieżące liczby są generowane w README przez `scripts/catalog-stats.mjs` i sprawdzane testem.

## Zapis, migracja i kopie

Aktywny format JSON ma `version: 2`. Wpis barku ma `whiskyId`, `quantity` (1–999) i `openedCount` (0–quantity). Liczba zamkniętych to różnica. Zmniejszenie całkowitego stanu ogranicza liczbę otwartych do nowej ilości. Skan dodaje zamkniętą butelkę, nie zmienia liczby już otwartych. Wycena liczy wszystkie całe butelki zgodnie z dotychczasowymi zasadami.

`validateJournal()` akceptuje v1 i v2. Starsze `opened: true` oznacza jedną otwartą butelkę, niezależnie od całkowitej ilości; `false` daje zero. Walidacja sprawdza również powiązania ID, duplikaty, daty, zdjęcia, oceny, aliasy i nowe metadane własnych whisky. Nie importuje dowolnych dodatkowych pól.

Migrowany dziennik trafia do `dram.journal.v2`, a klucz `dram.journal.v1` zostaje zachowany. Karta z dawnym kodem może zapisywać wyłącznie stary klucz; nie nadpisze nowego dziennika. Nowa aplikacja sygnalizuje późniejsze zmiany starego klucza i pozwala pobrać ich kopię. Przy braku miejsca nowy zapis nie usuwa starego; aplikacja pokazuje błąd i udostępnia eksport. Ustawienia nie wchodzą do dziennika i pozostają w osobnym kluczu.

Eksport JSON zawiera własne whisky, zdjęcia (w tym lokalne data URL), daty, notatki, aromaty, stock, życzenia i powiązania kodów. Import sprawdza plik przed pokazaniem potwierdzenia; limit pliku wynosi 20 MB. Podgląd umożliwia pobranie obecnej kopii i anulowanie. Zastąpienie danych wymaga wyraźnego kliknięcia. Jeśli zapis zmienił się od wyboru pliku, import jest odrzucany zamiast nadpisywać nowszy dziennik. Uszkodzony JSON i niespójne dane nie zmieniają istniejącego zapisu. Poprawny, potwierdzony import może przywrócić również wcześniej uszkodzony zapis.

## Karty przeglądarki i konflikty

`journal-store.ts` kolejkuje operacje w karcie. Każdy zapis odbywa się pod wspólną blokadą transakcji IndexedDB (bez przechowywania dziennika w IndexedDB); w przeglądarkach obsługujących Web Locks poprzedza ją również blokada `dram.journal.write.v2`. Fallback bez Web Locks korzysta z tej samej transakcji, więc różne ścieżki nie omijają wspólnej blokady. Odczyt, porównanie wersji i zapis localStorage odbywają się synchronicznie wewnątrz sekcji krytycznej.

Zdarzenie `storage` aktualizuje widok bez ponownego zapisywania otrzymanych danych. Odczyt po powrocie do karty sprawdza pominięte zdarzenia. Konflikt zachowuje najnowszy poprawny dziennik na dysku i pokazuje komunikat z eksportem niezapisanego wariantu. Edycja degustacji dodatkowo porównuje oryginalny wpis: formularz otwarty przed zmianą w innej karcie nie może jej cicho zastąpić. Szkic pozostaje w formularzu i w kopii niezapisanych zmian. Potwierdzenia usunięcia i importu sprawdzają wersję z chwili otwarcia.

Blokada nie synchronizuje urządzeń ani różnych profili przeglądarki. Jeśli transakcja lub zapis są niedostępne, aplikacja nie przechodzi na ryzykowny zapis bez blokady. Błąd limitu miejsca zachowuje dotychczasowy dziennik i eksportowalny szkic zmiany.

## Klasyfikacja

Kategorie wydań pozostają bez zmian. `whiskyType` ma niezależne stabilne wartości i osobny filtr; obejmuje również likiery, napoje na bazie whisky i nieustalony typ. Żaden ze wcześniejszych 598 rekordów ani napojów poniżej 40% nie został usunięty. Historyczne Old Time 1907 37% zachowano obok 13 napojów smakowych.

`ageStatus` ma wartości `stated`, `nas`, `unknown`. Puste `age` bez jawnego potwierdzenia NAS pokazuje „Brak danych”. Sprawdzono dostępne własne atrybuty produktów i archiwalne źródła, a nie ogólną nawigację sklepów. Niepewności pozostały jawne. W części kart sklepowe „Bourbon” nie odpowiadało etykiecie Jack Daniel’s Tennessee Whiskey; edycje Rye i Single Malt sprawdzano osobno. Green Label i Monkey Shoulder są blended malt, a nie zwykłym blendem słodowo-zbożowym. Źródła i cytaty zapisano w audycie klasyfikacji.

Maker’s Mark ma poprawioną nazwę, bez zmiany ID oryginalnego wpisu. Suntory jest marką nadrzędną; istniejące ID Toki i Toki Black są zachowane. Linie Toki, Hibiki, Yamazaki i Hakushu używają osobnego `series`. Oficjalny znak House of Suntory pochodzi z publicznej strony producenta.

Kraj pochodzenia nie pochodzi z lokalizacji lub języka sklepu. Dla Jim Beam Peach 32,5% Hiszpania pozostaje niepotwierdzonym twierdzeniem sprzedawcy; nie przepisano jej do rynku sprzedaży. Oficjalna amerykańska karta opisuje bourbon z Kentucky jako bazę, lecz nie ustala kraju produkcji tego europejskiego napoju. Dlatego kraj jest nieustalony. Pole `salesMarket` jest odrębne i opcjonalne. Nikka From the Barrel i Days mają zachowawczy typ Blended Whisky, bez przypisywania niepotwierdzonej zgodności ze standardem Japanese Whisky.

## Dodane pozycje

Dodano wszystkie 40 wymaganych pozycji, bez duplikowania istniejących produktów. Wybrano rzeczywiste oferowane pojemności (Bulleit 1000 ml, Nikka From the Barrel 500 ml, pozostałe 700 ml). Aberlour to klasyczne 12 Double Cask Matured 40%, nie inny produkt Non Chill Filtered 48%. Talisker 10 i Bunnahabhain 12 poprawiono odpowiednio na 45,8% i 46,3% po potwierdzeniu zaokrąglonych wartości sklepu w drugim źródle.

| Nr | Marka i wydanie | Kraj | Kod potwierdzony |
| --- | --- | --- | --- |
| 1 | The Macallan 12 Double Cask | Szkocja | Tak |
| 2 | The Glenlivet 12 Double Oak | Szkocja | Tak |
| 3 | Laphroaig 10 | Szkocja | Tak |
| 4 | Lagavulin 16 | Szkocja | Tak |
| 5 | Talisker 10 | Szkocja | Tak |
| 6 | Glenmorangie The Original 12 | Szkocja | Tak |
| 7 | The Balvenie 12 DoubleWood | Szkocja | Tak |
| 8 | Highland Park 12 | Szkocja | Tak |
| 9 | Aberlour 12 Double Cask Matured | Szkocja | Brak potwierdzenia |
| 10 | The Dalmore 12 | Szkocja | Tak |
| 11 | The GlenDronach 12 | Szkocja | Tak |
| 12 | Bowmore 12 | Szkocja | Tak |
| 13 | Oban 14 | Szkocja | Tak |
| 14 | Caol Ila 12 | Szkocja | Tak |
| 15 | Bunnahabhain 12 | Szkocja | Tak |
| 16 | Buffalo Trace Kentucky Straight Bourbon | USA | Tak |
| 17 | Woodford Reserve Distiller’s Select | USA | Tak |
| 18 | Bulleit Bourbon | USA | Tak |
| 19 | Wild Turkey 101 | USA | Tak |
| 20 | Four Roses Single Barrel | USA | Tak |
| 21 | Maker’s Mark 46 | USA | Brak potwierdzenia |
| 22 | Knob Creek 9 | USA | Tak |
| 23 | Eagle Rare 10 | USA | Tak |
| 24 | Elijah Craig Small Batch | USA | Brak potwierdzenia |
| 25 | Michter’s US*1 Bourbon | USA | Tak |
| 26 | Redbreast 12 | Irlandia | Tak |
| 27 | Teeling Small Batch | Irlandia | Tak |
| 28 | Mitchell & Son Green Spot | Irlandia | Tak |
| 29 | Connemara Original | Irlandia | Tak |
| 30 | Tullamore D.E.W. 12 | Irlandia | Tak |
| 31 | Writers’ Tears Copper Pot | Irlandia | Tak |
| 32 | Nikka From the Barrel | Japonia | Tak |
| 33 | Nikka Days | Japonia | Tak |
| 34 | Suntory Hibiki Japanese Harmony | Japonia | Tak |
| 35 | Suntory Yamazaki Distiller’s Reserve | Japonia | Tak |
| 36 | Suntory Hakushu Distiller’s Reserve | Japonia | Tak |
| 37 | Kavalan Classic | Tajwan | Tak |
| 38 | Amrut Fusion | Indie | Tak |
| 39 | Starward Two-Fold | Australia | Tak |
| 40 | Canadian Club Original | Kanada | Tak |

Wszystkie nowe pozycje mają cenę i datę sprawdzenia: 38 źródeł NL oraz dwie referencje UK (Aberlour i Starward). Starward jest wyprzedany u źródła; cena jest referencją historyczną, co zaznaczono. Nie zmieniono dotychczasowego sposobu wyceny referencji ani dotychczasowych cen.

Potwierdzono 37 nowych kodów. Dla Aberlour brak opublikowanego kodu pasującego do pełnej butelki w sprawdzonym źródle. Kandydat Maker’s Mark 46 ma błędną cyfrę kontrolną. Elijah Craig ma kod sklepu z zakresu ograniczonego obiegu, niepotwierdzony jako globalny GTIN butelki. Nie naprawiamy kodów zgadywaniem cyfr. Wszystkie wcześniejsze powiązania kodów zachowano.

Czterdzieści zdjęć sprawdzono wizualnie pod kątem wydania i parametrów. Nowe zdjęcia są linkowane do oryginalnych publicznych plików sprzedawców, z podpisem źródła i SHA-256 w metadanych; nie rozpowszechniamy ich kopii w repozytorium ani nie przypisujemy im niepotwierdzonej otwartej licencji. Fotografie wcześniejszych 598 wydań zachowały swoje pliki i sumy SHA. Test sieciowy weryfikuje wszystkie nowe oryginały przez HTTPS; ich przyszła dostępność zależy od źródła.

## Weryfikacja

`npm test`, build i TypeScript, istniejące E2E, nowe `journal-e2e.py` oraz `catalog-features-e2e.py`, kontrola oryginalnych zdjęć `remote-photos.py`. Testy migracji i dwóch kart zachowują oceny, daty, zdjęcia, własne wpisy, kody i życzenia; sprawdzają też szkic po konflikcie, zatrzymany import, liczniki otwartych butelek, skaner i fallback bez Web Locks. Testy nie zastępują prawdziwych zapisów użytkownika.

Filtr wieku obejmuje zarówno status danych (deklaracja / NAS / brak danych), jak i konkretną liczbę lat. Wybranie liczby lat wymaga deklarowanego wieku; wybranie NAS lub braku danych czyści filtr liczbowy.

`data/preservation-baseline-2026-10-19.json` i test `preservation.test.mjs` kontrolują wszystkie dotychczasowe ID, niezmieniane pola wydań, zdjęcia, ceny i powiązania kodów.

## Zmienione pliki

- `README.md`
- `data/barcode-audit.json`
- `data/barcode-coverage.json`
- `data/brand-sources.json`
- `data/catalog-sources.json`
- `data/classification-audit-2026-10-19.json`
- `data/popular-expansion-2026-10-19.json`
- `data/preservation-baseline-2026-10-19.json`
- `data/price-evidence.json`
- `docs/barcode-scanning.md`
- `docs/redesign.md`
- `docs/reliability-and-catalog.md`
- `docs/ui-simplification.md`
- `index.html`
- `public/brands/suntory.svg`
- `scripts/analyze-photos.py`
- `scripts/catalog-stats.mjs`
- `src/App.tsx`
- `src/BarcodeScanner.tsx`
- `src/barcode.ts`
- `src/barcodes.json`
- `src/brands.ts`
- `src/catalog.json`
- `src/classification.ts`
- `src/components/BackupControls.tsx`
- `src/components/WhiskyCard.tsx`
- `src/components/WhiskyDetails.tsx`
- `src/english.json`
- `src/journal-lock.ts`
- `src/journal-store.ts`
- `src/model.ts`
- `src/photo-layout.json`
- `src/prices.json`
- `src/styles.css`
- `src/useJournal.ts`
- `tests/barcode-e2e.py`
- `tests/barcode.test.mjs`
- `tests/brands-e2e.py`
- `tests/catalog-audit-e2e.py`
- `tests/catalog-features-e2e.py`
- `tests/catalog-features.test.mjs`
- `tests/discovery-cellar-e2e.py`
- `tests/e2e.py`
- `tests/journal-e2e.py`
- `tests/journal-store.test.mjs`
- `tests/live-smoke.py`
- `tests/model.test.mjs`
- `tests/preferences-e2e.py`
- `tests/preservation.test.mjs`
- `tests/redesign-e2e.py`
- `tests/remote-photos.py`
- `tests/scanner-wishlist-e2e.py`
- `tests/source_images.py`

## Wyniki końcowej kontroli

Przeszły 43 testy Node (`npm test`), build Vite i kontrola TypeScript bez nieużywanych elementów. Przeszło 10 zestawów E2E: podstawowy dziennik, marki, odkrywanie i wycena, skaner zdjęć/kamery, skaner i życzenia, układ/WCAG, ustawienia języka/regionu, wcześniejszy audyt, nowy dziennik wielokartowy oraz nowe produkty i filtry. Kontrola układu objęła 60 widoków przy szerokościach 320, 375, 390, 768, 1024 i 1440 px. Wszystkie 40 nowych zdjęć pobrano kontrolnie przez HTTPS z weryfikacją SHA-256; nowe zdjęcia nie są kopiowane do repozytorium. Nie przeprowadzano testów na fizycznym telefonie — testy przeglądarkowe używają Chromium.

GitHub Pages nadal ma źródło `legacy`. Próba przełączenia na istniejący workflow GitHub Actions została odrzucona przez GitHub jako `Resource not accessible by integration` (HTTP 403); nie zmieniono ustawienia ani nie obchodzono ograniczenia. Istniejący workflow zachowuje oczekiwanie na koniec publikacji legacy, a następnie publikuje zbudowaną aplikację. Właściciel repozytorium może wybrać Settings → Pages → Build and deployment → Source → GitHub Actions, aby wyeliminować pośrednią publikację surowych źródeł.
