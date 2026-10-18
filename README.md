# Dram — Twój świat whisky

Mobilny dziennik whisky: własny barek, lista życzeń i oceny degustacji. React + TypeScript + Vite. Interfejs po polsku, dolna nawigacja na telefonie, panel boczny na komputerze.

## Funkcje

- 541 kart: 253 Johnnie Walker / John Walker & Sons, 122 Jack Daniel’s oraz 166 pozycji pozostałych ośmiu marek. Każda ma autentyczne zdjęcie, parametry, cenę orientacyjną i źródła.
- Dziesięć wypełnionych marek, w tym Chivas Regal. TOKI ma przezroczysty znak literowy wyizolowany z etykiety producenta za pomocą edytora obrazów; zdjęcia butelek są oryginalne.
- Wspólny barek, życzenia i oceny dla wszystkich marek.
- Wyszukiwanie po nazwie, serii i nutach smakowych; filtry edycji; domyślne sortowanie cenowe oraz sortowanie po nazwie, własnej średniej ocen i wieku.
- Barek z liczbą butelek i oznaczeniem otwartej butelki. Dodanie do barku usuwa whisky z życzeń.
- Lista życzeń, wiele degustacji tej samej whisky, oceny 1–10 co 0,5, data, własne notatki i wybrane aromaty. Edycja i usuwanie degustacji.
- Własne wpisy whisky ze zdjęciem z telefonu lub adresem HTTPS. Zdjęcia z telefonu są zmniejszane lokalnie przed zapisaniem.
- Ochrona przed nadpisaniem uszkodzonego zapisu. Bez panelu ustawień i komunikatów o pamięci urządzenia w zwykłym interfejsie.
- Manifest do dodania strony do ekranu głównego. Brak service workera: ponowne załadowanie aplikacji wymaga sieci.

Dane dziennika są przechowywane w `localStorage` konkretnej przeglądarki. Aplikacja nie wymaga konta ani backendu, nie synchronizuje urządzeń i nie wysyła ocen na serwer. Odzyskanie zapisu jest dostępne wyłącznie w komunikacie rzeczywistego błędu odczytu lub zapisu.

## Uruchomienie

Node.js 24 (przetestowano 24.19.0) i npm.

```sh
npm ci
npm run dev
```

Aplikacja używa ścieżki bazowej `/whisky/`, zgodnej z repozytorium GitHub Pages. Aby hostować ją w katalogu głównym innej domeny, zmień `base` w `vite.config.ts` oraz `start_url` i `scope` w `public/manifest.webmanifest`.

```sh
npm test
npm run build
npm run preview
```

Testy modelu sprawdzają kopie, nieprawidłowe dane, unikatowość katalogu oraz sumy SHA-256 wszystkich zdjęć. Testy przeglądarkowe wymagają Python Playwright i Chromium:

```sh
python -m pip install playwright
DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/e2e.py
```

`CHROMIUM_PATH` pozwala wskazać inną lokalizację Chromium. Testy używają izolowanej sesji przeglądarki i nie zmieniają Twoich danych. Obejmują wyszukiwanie, filtrowanie, paginację, życzenia → barek, ilości, otwarcie butelki, dodawanie/edycję ocen, zdjęcie własnej whisky, ochronę uszkodzonego zapisu, trwałość po odświeżeniu i szerokości 320–1440 px.

## Katalog i prawdziwe zdjęcia

Stan weryfikacji: **18 października 2026**. Źródła: publiczne karty producenta, Master of Malt, The Whisky Exchange, Drankgigant, Topdrinks oraz zakończone aukcje Scotch Whisky Auctions. Uwzględniono różne wydania, projekty etykiet i historyczne butelkowania — liczba kart nie oznacza 541 różnych receptur. Nie dodajemy osobnych pozycji wyłącznie dla innej pojemności, braku kartonika lub zestawu z kieliszkami.

- `src/catalog.json`: dane używane przez aplikację; stałe identyfikatory.
- `public/bottles/`: 541 zdjęć pobranych ze źródeł, bez generowania obrazów ani podmieniania etykiet.
- `data/catalog-sources.json`: oryginalna nazwa produktu, strona źródłowa, adres zdjęcia, rozmiar, data sprawdzenia i suma SHA-256.
- `data/catalog-exclusions.json`: pominięte oferty, w tym zastępcza grafika „Waiting to be shot”.

Zdjęcia skontrolowano także wizualnie w galerii całego katalogu. Nazwy i zdjęcia należą do odpowiednich właścicieli; aplikacja podaje ich źródła. Dane nie stanowią zapewnienia aktualnej dostępności w sklepach. Dla whisky archiwalnych parametry odnoszą się do sfotografowanego wydania. Etykieta NAS oznacza brak deklaracji wieku w zapisanych danych. Kategorie są redakcyjnym podziałem kolekcji; „edycja specjalna” obejmuje również wydania regionalne.

Przy aktualizacji katalogu sprawdź nazwę i etykietę każdego zdjęcia. Nie dodawaj ilustracji zastępczych sprzedawców ani duplikatów samych pojemności. Zachowaj istniejące identyfikatory — dziennik użytkownika odwołuje się do nich. Zapisz pochodzenie i sumę pliku oraz uruchom testy.

## Publikacja

Workflow `.github/workflows/deploy-pages.yml` instaluje zależności z lockfile, uruchamia testy, buduje aplikację i publikuje artefakt przez GitHub Pages po zmianie gałęzi `main`. Zalecanym źródłem Pages w ustawieniach repozytorium jest **GitHub Actions**. Jeśli repozytorium nadal automatycznie publikuje pliki z `main` w trybie legacy, workflow czeka na zakończenie tej publikacji, a następnie publikuje zbudowaną aplikację. Zapobiega to nadpisaniu buildu surowym `index.html` odwołującym się do TSX. Po publikacji `scripts/check-deployment.mjs` pobiera publiczny HTML i sprawdza dostępność oraz typ MIME skompilowanego JavaScriptu i CSS. Dodatkowy test publicznej strony można uruchomić przez `python tests/live-smoke.py`. Publikacja środowiska Codex to osobna operacja od publikacji strony w GitHub Pages.

## Orientacyjne ceny

Ceny w EUR: 131 ofert sklepów holenderskich, 260 wycen na podstawie sprzedanych aukcji, 148 referencji zagranicznych oraz 2 ceny zgłoszone przez użytkownika: Sabrina 25 € w Gall & Gall (promocja) i Sweet Blend ok. 19 € w Al Capone w Polsce (obie bez niezależnego potwierdzenia). Rodzaj źródła jest widoczny na karcie. Szczegóły, data i odnośnik znajdują się w whisky. Aukcje nie obejmują prowizji, podatków i dostawy; mediany obejmują do pięciu dopasowanych sprzedaży. Zagraniczne ceny są przeliczane według kursu z 16.10.2026, a nowe Goldfinch z 17.10.2026, bez szacowania importu. Ceny dotyczą wskazanej pojemności, bez proporcjonalnego przeliczania. Dowody: `data/price-evidence.json`, kurs: `data/exchange-rate.json`.

Domyślnie katalog jest sortowany od najniższej ceny. Dodano 114 wydań Johnnie Walkera i 122 wydań Jack Daniel’s, zachowując wszystkie wcześniejsze identyfikatory i zapisane dane. To katalog potwierdzonych wydań, nie deklaracja kompletności wszystkich historycznych etykiet. Zdjęcia są oryginalnymi plikami źródłowymi, bez generowania i retuszu.

## Kadrowanie i nowe marki

`src/brands.ts` przypisuje whisky do marek; wszystkie dziesięć marek ma whisky. Dotychczasowe identyfikatory katalogu pozostają niezmienione. `data/brand-sources.json` zawiera pochodzenie i sumy logotypów, a `data/jack-daniels-audit.json` opisuje przegląd nowych wydań, wykluczenia i korekty. Nie uznajemy za osobne edycje każdej pojemności lub pudełka. Whisky smakowe Honey, Fire, Apple i Blackberry są opisane jako likiery na bazie whiskey; Winter Jack jako whiskey punch.

Pliki oryginalnych zdjęć pozostają niezmienione. `scripts/analyze-photos.py` (Pillow) mierzy wolne marginesy i kolor tła, zapisując wyłącznie metadane w `src/photo-layout.json`. CSS przybliża kadr, dopasowuje otoczenie do papieru fotograficznego i łagodnie łączy krawędzie. Ręczne ramy w `data/photo-framing.json` odcinają tło Winter i torbę zakupową przy Spring, zachowując oryginalne piksele butelek. Nie generujemy etykiet. Przeglądarki bez `object-view-box` pokazują pełne oryginalne zdjęcie. Po zmianie zdjęć uruchom analizę ponownie, testy i build.

Dodatkowy test: `DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/brands-e2e.py` — wybór dziesięciu wypełnionych marek, sortowanie cenowe, źródła, wspólne życzenia i szerokości 320–1440 px.

Własne wpisy spoza dziesięciu marek pozostają dostępne przez „Moje własne wpisy” na ekranie wyboru. Rozdzielenie marek nie migruje ani nie usuwa dziennika.

Rozszerzenie 18.10: Jim Beam 12, Goldfinch 18, Ardbeg 18, Bushmills 19, Ballantine’s 8, Toki 2, Chivas Regal 13. Ceny Goldfinch pochodzą z katalogu producenta UK, również dla wyprzedanych wydań; są referencją zagraniczną, a nie bieżącą ofertą NL. Podsumowanie w `data/catalog-expansion-2026-10-18.json`.

## Wyszukiwanie i wartość barku

Wyszukiwarka na ekranie wyboru marki przeszukuje cały katalog i własne wpisy bez otwierania marki; obsługuje apostrofy, polskie znaki, dowolną kolejność słów i paginację. Wartość barku to suma cen katalogowych razy liczba butelek, niezależna od filtra listy. Otwartej butelki nie przeliczamy według nieznanej ilości pozostałego płynu. Nieznane ceny własnych wpisów są wyraźnie wyłączone z sumy i policzone osobno.

Dodano Glenfiddich (30 wydań) i 46 pozycji w pozostałych markach. Audyt: `data/catalog-expansion-glenfiddich-2026-10-18.json`. Cena Sweet Blend pochodzi ze zgłoszenia użytkownika; producent potwierdza 30% i klasyfikację spirit drink. Źródłowe zdjęcie producenta ma niebieskie linie techniczne, wykluczone wyłącznie maską CSS w `data/photo-framing.json`. Logotyp Glenfiddich został wyizolowany edytorem obrazu z autentycznego zdjęcia butelki; nie jest oryginalnym plikiem wektorowym. Wszystkie zdjęcia butelek pozostają oryginalne.

`DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/discovery-cellar-e2e.py` sprawdza wyszukiwanie między markami, paginację, Sweet Blend, ilości, wartość barku niezależną od filtrów, brakujące wyceny, trwałość i szerokości 320–1440 px.
