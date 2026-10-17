# Dram — Twój świat whisky

Mobilny dziennik whisky: własny barek, lista życzeń i oceny degustacji. React + TypeScript + Vite. Interfejs po polsku, dolna nawigacja na telefonie, panel boczny na komputerze.

## Funkcje

- 253 kart wydań z rodziny Johnnie Walker / John Walker & Sons, każda z autentycznym zdjęciem, parametrami i linkiem do źródła.
- Wyszukiwanie po nazwie, serii i nutach smakowych; filtry edycji; sortowanie po nazwie, własnej średniej ocen i wieku.
- Barek z liczbą butelek i oznaczeniem otwartej butelki. Dodanie do barku usuwa whisky z życzeń.
- Lista życzeń, wiele degustacji tej samej whisky, oceny 1–10 co 0,5, data, własne notatki i wybrane aromaty. Edycja i usuwanie degustacji.
- Własne wpisy whisky ze zdjęciem z telefonu lub adresem HTTPS. Zdjęcia z telefonu są zmniejszane lokalnie przed zapisaniem.
- Eksport i przywracanie kopii JSON, walidacja pliku, ochrona przed nadpisaniem uszkodzonego zapisu.
- Manifest do dodania strony do ekranu głównego. Brak service workera: ponowne załadowanie aplikacji wymaga sieci.

Dane dziennika są przechowywane w `localStorage` konkretnej przeglądarki. Aplikacja nie wymaga konta ani backendu, nie synchronizuje urządzeń i nie wysyła ocen na serwer. Kopię należy eksportować przed czyszczeniem danych przeglądarki. Po zapełnieniu pamięci pojawia się komunikat; eksport pozostaje dostępny.

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

`CHROMIUM_PATH` pozwala wskazać inną lokalizację Chromium. Testy używają izolowanej sesji przeglądarki i nie zmieniają Twoich danych. Obejmują wyszukiwanie, filtrowanie, paginację, życzenia → barek, ilości, otwarcie butelki, dodawanie/edycję ocen, zdjęcie własnej whisky, eksport/import, błędną kopię, trwałość po odświeżeniu i szerokości 320–1440 px.

## Katalog i prawdziwe zdjęcia

Stan weryfikacji: **17 października 2026**. Źródła: publiczne karty producenta, Master of Malt, The Whisky Exchange, Drankgigant, Topdrinks oraz zakończone aukcje Scotch Whisky Auctions. Uwzględniono różne wydania, projekty etykiet i historyczne butelkowania — liczba kart nie oznacza 253 różnych receptur. Nie dodajemy osobnych pozycji wyłącznie dla innej pojemności, braku kartonika lub zestawu z kieliszkami.

- `src/catalog.json`: dane używane przez aplikację; stałe identyfikatory.
- `public/bottles/`: 253 zdjęć pobranych ze źródeł, bez generowania obrazów ani podmieniania etykiet.
- `data/catalog-sources.json`: oryginalna nazwa produktu, strona źródłowa, adres zdjęcia, rozmiar, data sprawdzenia i suma SHA-256.
- `data/catalog-exclusions.json`: pominięte oferty, w tym zastępcza grafika „Waiting to be shot”.

Zdjęcia skontrolowano także wizualnie w galerii całego katalogu. Nazwy i zdjęcia należą do odpowiednich właścicieli; aplikacja podaje ich źródła. Dane nie stanowią zapewnienia aktualnej dostępności w sklepach. Dla whisky archiwalnych parametry odnoszą się do sfotografowanego wydania. Etykieta NAS oznacza brak deklaracji wieku w zapisanych danych. Kategorie są redakcyjnym podziałem kolekcji; „edycja specjalna” obejmuje również wydania regionalne.

Przy aktualizacji katalogu sprawdź nazwę i etykietę każdego zdjęcia. Nie dodawaj ilustracji zastępczych sprzedawców ani duplikatów samych pojemności. Zachowaj istniejące identyfikatory — dziennik użytkownika odwołuje się do nich. Zapisz pochodzenie i sumę pliku oraz uruchom testy.

## Publikacja

Workflow `.github/workflows/deploy-pages.yml` instaluje zależności z lockfile, uruchamia testy, buduje aplikację i publikuje artefakt przez GitHub Pages po zmianie gałęzi `main`. Zalecanym źródłem Pages w ustawieniach repozytorium jest **GitHub Actions**. Jeśli repozytorium nadal automatycznie publikuje pliki z `main` w trybie legacy, workflow czeka na zakończenie tej publikacji, a następnie publikuje zbudowaną aplikację. Zapobiega to nadpisaniu buildu surowym `index.html` odwołującym się do TSX. Po publikacji `scripts/check-deployment.mjs` pobiera publiczny HTML i sprawdza dostępność oraz typ MIME skompilowanego JavaScriptu i CSS. Dodatkowy test publicznej strony można uruchomić przez `python tests/live-smoke.py`. Publikacja środowiska Codex to osobna operacja od publikacji strony w GitHub Pages.

## Orientacyjne ceny

Ceny w EUR: 26 ofert sklepów holenderskich, 192 wyceny na podstawie sprzedanych aukcji, 34 referencje sklepów zagranicznych oraz 1 promocyjna cena Sabriny zgłoszona przez użytkownika (25 € w Gall & Gall, bez niezależnego potwierdzenia). Rodzaj źródła jest widoczny na karcie. Szczegóły, data i odnośnik znajdują się w whisky. Aukcje nie obejmują prowizji, podatków i dostawy; mediany obejmują do pięciu dopasowanych sprzedaży. Zagraniczne ceny są przeliczane według kursu z 16.10.2026, bez szacowania importu. Ceny dotyczą wskazanej pojemności, bez proporcjonalnego przeliczania. Dowody: `data/price-evidence.json`, kurs: `data/exchange-rate.json`.

Domyślnie katalog jest sortowany od najniższej ceny. Dodano 114 zweryfikowanych wydań, zachowując wszystkie wcześniejsze identyfikatory i zapisane dane. To katalog potwierdzonych wydań, nie deklaracja kompletności wszystkich historycznych etykiet. Zdjęcia są oryginalnymi plikami źródłowymi, bez generowania i retuszu.
