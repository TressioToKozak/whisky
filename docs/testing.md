# Testy Dram 2.0 — po fazie 2

## Środowisko

Node 24, React 19, TypeScript/Vite, Python 3.12 i Playwright z `tests/requirements.txt`. W chmurze użyto systemowego Chromium `/usr/bin/chromium`. Pakietowe binaria Firefox i WebKit nie są dostępne lokalnie; ich wyniki są osobnymi obowiązkowymi bramkami CI. Nie było dostępu do fizycznego iPhone'a ani Androida.

```sh
npm ci
# Przy katalogu domowym tylko do odczytu: npm ci --cache /workspace/.npm-cache
npm test
npm run build
npx tsc --noUnusedLocals --noUnusedParameters
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Narzędzia przeglądarki: `python -m pip install -r tests/requirements.txt`, `python -m playwright install --with-deps chromium`. `CHROMIUM_PATH` może wskazywać binarium systemowe. `DRAM_URL` wybiera adres serwera.

## Zakres

- Zachowane testy jednostkowe starego modelu, katalogu, kodów, cen, preferencji i protokołu zapisów v2.
- `collection-model.test.mjs`: migracje v1/v2/v3, deterministyczne ID, nieznane fakty, zachowanie metadanych, wycofywanie bez usuwania, konflikty, lokalizacje, kwoty i waluty, dokumenty, quota, starsze karty oraz stare zamiary odzyskane już po utworzeniu v3.
- Wszystkie wcześniejsze E2E nadal sprawdzają działające funkcje, teraz wobec rzeczywistych store IndexedDB przez `indexed_helpers.py`, bez mirroru w localStorage. W testowych fixture stan fizyczny jest źródłem prawdy; dawne liczniki nie służą do dopisywania egzemplarzy do v3.
- `collection-e2e.py`: prawdziwy scenariusz 5 egzemplarzy / 2 otwarte, zachowany v2, lokalizacje i ruch masowy, zakup, napełnienie, zdjęcie i PDF, stale edit z dwóch kart, sprzedaż brutto/netto i pełna kopia v3.
- `collection-ui-e2e.py`: PL/EN, egzemplarze i edytor na 320, 375, 390, 768, 1024, 1440 px, klawiatura, Escape i axe WCAG A/AA, zapis w już załadowanej aplikacji po odcięciu sieci.
- `redesign-e2e.py`: dotychczasowe 60 widoków i dostępność.
- `quality-e2e.py`: przerwanie zapisu odświeżeniem / zamknięciem, trwałe zamiary v3, notatki i życzenia, importy i błędy zdjęć.

`phase2-e2e.py` sprawdza zimny start po zamknięciu wszystkich stron i odcięciu sieci, edycję w leniwym module oraz drugi restart offline. `offline-update-e2e.py` serwuje dwie prawdziwe rewizje service workera, sprawdza weto drugiego edytora, zachowanie szkicu i jawne przeładowanie wyłącznie aktualizowanej karty. Kont i synchronizacji urządzeń nie wdrożono.

## CI

Przed publikacją uruchamiane są testy jednostkowe, build oraz `quality-e2e.py`, `journal-e2e.py`, `collection-e2e.py`, `phase2-e2e.py` i `offline-update-e2e.py`. Dodatkowe obowiązkowe joby uruchamiają `phase2-e2e.py` z `DRAM_BROWSER=firefox` i `webkit`. Testy szybkie korzystają z jawnej fixtury zewnętrznych obrazów. Osobny workflow nadal sprawdza prawdziwe źródła zdjęć, bez blokowania CI zależnością od sklepów. `axe-core` jest przypiętą zależnością developerską; nowe testy fazy 2 wymagają jego obecności i badają obie palety. Starsze zestawy nadal podają, czy wykonały axe.

## Procedura iPhone / Android

1. Na testowym profilu telefonu otworzyć HTTPS, potwierdzić wiek, dodać do ekranu głównego. Poczekać na pełną instalację shell, zamknąć aplikację, włączyć tryb samolotowy i uruchomić ponownie.
2. Na zachowanej kopii v1/v2 sprawdzić ilości, otwarte egzemplarze, notatki i życzenia; wyeksportować v3 i sprawdzić liczbę fizycznych rekordów. Nie używać jedynej istniejącej kopii do testów.
3. Dodać dwa egzemplarze, otworzyć jeden, uzupełnić zakup EUR i drugi PLN. Sprawdzić osobne sumy walut i nieznane koszty.
4. Wprowadzić ml i procent, sprawdzić limit pojemności, lokalizację i masowy ruch, archiwum opróżnionych/sprzedanych. Sprawdzić klawiaturę numeryczną i kalendarz przy wąskim ekranie.
5. Dodać prywatne zdjęcia oraz PDF; eksportować, anulować import, następnie potwierdzić poprawny import i sprawdzić wszystkie pliki.
6. Otworzyć dwie karty, edytować ten sam egzemplarz, zapisać drugą wersję, sprawdzić konflikt i zachowany szkic pierwszej. Natychmiast odświeżyć / zamknąć po kliknięciu + i po zmianie liczby otwartych; ponownie otworzyć i sprawdzić odzysk.
7. Kamera: zgoda/odmowa, zdjęcie kodu, nieznany kod, dopasowanie i potwierdzenie nowego egzemplarza. Brak zgody nie może dodawać stanu.
8. VoiceOver/TalkBack: etykiety pól, checkboxy, kolejność fokusu, zamykanie tylko najwyższego dialogu. Sprawdzić powiększenie tekstu, obrót i reduced motion.
9. Odłączyć sieć przy już otwartej aplikacji, zapisać notatkę, wrócić online i sprawdzić dane. Zamknąć wszystkie karty i ponownie uruchomić offline; zapisać zmianę i sprawdzić ją po kolejnym restarcie.

Wyniki końcowe: 72 testy jednostkowe i 13 zestawów E2E zaliczone, build i TypeScript poprawne. 84 widoki bez przewijania poziomego; wybrane widoki axe bez naruszeń. Szczegóły: [raport fazy 1](phase-1-report.md).

## Nowe testy i odtwarzanie fazy 2

`indexed-collection.test.mjs`: prawdziwa semantyka transakcji z fake-indexeddb, sześć store i indeksy, źródłowy SHA, osobne bytes, dowolna kolejność ID, dwie równoległe migracje, przerwana migracja bez markera, quota w trakcie zapisu, checksum/naprawa i kompaktowe referencje plików. `tabular.test.mjs`: cudzysłowy, BOM, CRLF, wielowierszowe dane, mapowanie, nieznane wydania, kwoty, duplikaty i ochrona formuł. Python dodatkowo sprawdza CRC ZIP oraz poprawność XML w XLSX.

```sh
DRAM_OFFLINE_IMAGES=1 DRAM_URL=http://127.0.0.1:4173/whisky/ python tests/phase2-e2e.py
DRAM_OFFLINE_IMAGES=1 python tests/offline-update-e2e.py
# Po instalacji binariów Playwright:
DRAM_BROWSER=firefox DRAM_OFFLINE_IMAGES=1 python tests/phase2-e2e.py
DRAM_BROWSER=webkit DRAM_OFFLINE_IMAGES=1 python tests/phase2-e2e.py
```

Lokalne pobieranie dodatkowych silników blokował serwer proxy (403); próba zgody na pobranie została przerwana. To nie jest zaliczony test Safari/Firefox. Ich rzeczywiste wyniki należy odczytać z obowiązkowych jobów CI dla wdrażanego commitu. WebKit na Linuxie także nie zastępuje testu prawdziwego Safari/iOS, aparatu i instalacji PWA na telefonie.
