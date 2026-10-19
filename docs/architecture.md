# Dram 2.0 — architektura etapowa

Audyt bazowy: commit `ddbcbb3`, 638 wydań, React 19/TypeScript/Vite. Działają: katalog, dynamiczne marki od 4 wydań, skaner EAN/UPC/GTIN, barek ilościowy, życzenia, degustacje, źródłowe wyceny PL/NL, PL/EN, backup v1/v2, kolejka trwałych zmian i blokada między kartami. Brak: fizycznych egzemplarzy, bazy kolekcji w IndexedDB, offline po restarcie, backendu i kont.

## Plan i zależności

1. `collection-model.ts`: Journal v3, OwnedBottle, BottleEvent, Location; walidacja i deterministyczna migracja v1/v2. To źródło prawdy dla fazy 1.
2. `journal-store.ts`: dotychczasowy protokół blokady, porównania wersji i trwałych zamiarów otrzymuje parametr formatu. Domyślny v2 pozostaje testowalny. V3 używa osobnego klucza i osobnej przestrzeni oczekujących zmian.
3. `collection.ts`: projekcja dawnych liczników i adapter istniejących akcji. Wszystkie stare operacje barku zmieniają fizyczne egzemplarze; liczniki są wyliczane, nie stanowią osobnej kolekcji.
4. `CellarInstances`: edytor egzemplarza, metadane zakupu, statusy, historia, napełnienie, zdjęcia/dokumenty i lokalizacje. Edycja sprawdza pierwotny egzemplarz przed zapisem.
5. `collection-finance.ts`: koszty według waluty, orientacyjne ceny katalogowe, rzeczywiste sprzedaże. Nie dodaje nieistniejących notowań ani nie nazywa wyceny zyskiem.
6. Backup v3 obejmuje egzemplarze, zdarzenia i załączniki. Starsze formaty są przyjmowane przez migrację.
7. Faza 2 przeniesie właściwą kolekcję i binaria do IndexedDB oraz doda service worker. Faza 3 jest zależna od bezpiecznego lokalnego modelu oraz osobno skonfigurowanego backendu. Zaawansowane portfolio, Passport i Lens są kolejnymi fazami.

W fazie 1 IndexedDB nadal koordynuje blokadę, a zapis kolekcji pozostaje w localStorage. Nie deklarujemy jeszcze prawdziwego offline ani synchronizacji chmurowej. Istniejący branding, katalog i ceny pozostają zachowane.
