# Koszty i wartości — faza 1

Źródłowe `PriceQuote` i wszystkie istniejące ceny pozostają niezmienione. Ich rodzaj, data, rynek, pojemność, koszty i ograniczenia nadal są widoczne. Nie dodano fikcyjnych obserwacji cen ani automatycznych alertów.

- **Koszt posiadanych egzemplarzy:** tylko jawnie zapisane przez użytkownika kwoty zakupów. Osobno EUR, PLN, GBP i USD. Nieznane koszty oraz prezenty mają oddzielne liczniki; nie przyjmujemy ich wartości jako 0.
- **Dotychczasowa wartość barku:** orientacyjne katalogowe ceny całych posiadanych butelek, nadal także otwartych, bez korekty napełnienia. To kompatybilna referencja, nie wartość sprzedaży. Brak ceny i `referenceOnly` nadal są wykluczane. Filtry nie zmieniają sumy.
- **Referencja zamkniętych egzemplarzy:** oddzielny podzbiór tych samych notowań katalogowych. Nie jest obietnicą odsprzedaży.
- **Otwarte egzemplarze:** nie mają automatycznej wartości proporcjonalnej do pozostałych ml ani szacowanej ceny sprzedaży.
- **Wpływy brutto:** tylko rzeczywiste kwoty sprzedaży wpisane dla statusu `sold`.
- **Wpływy netto:** kwota brutto minus jawnie podane opłaty. Brak opłat oznacza wynik nieznany, a nie opłaty 0.
- **Zrealizowany wynik:** tylko gdy znane są brutto, opłaty oraz koszt zakupu w tej samej walucie. Prezenty i niespójne waluty nie otrzymują fikcyjnego wyniku. Ujemny wynik jest dopuszczony.

Nie sumujemy różnych walut transakcji i nie stosujemy dzisiejszego kursu do historycznych kosztów. Regionalne ceny referencyjne zachowują istniejący, ujawniony sposób przeliczenia PL/NL. Historia notowań, kursy transakcyjne z dowodami, wartość odtworzeniowa, szacunki sprzedaży, wykresy i alerty są zadaniami fazy 4. Wydatki historyczne są zachowane w rekordach egzemplarzy; miesięczne raporty nie są jeszcze zaimplementowane.
