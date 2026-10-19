# Synchronizacja — stan fazy 1

Działa synchronizacja kart tego samego profilu przeglądarki. Koordynacja korzysta z IndexedDB i opcjonalnie Web Locks; porównanie wersji nie dopuszcza bezwarunkowego nadpisania stanu. Dane kolekcji w fazie 1 nadal są w localStorage. Nie synchronizuje to urządzeń.

Nie ma jeszcze produkcyjnych kont, backendu Supabase, SQL/RLS ani wysyłania prywatnych danych. Nie ma pozornego przycisku logowania ani fikcyjnego stanu synchronizacji. Korzystanie bez konta pozostaje podstawowym trybem.

Faza 3 zależy od ukończenia IndexedDB i trwałej kolejki operacji w fazie 2. Następnie: osobny projekt Supabase, migracje PostgreSQL, RLS według `auth.uid()`, prywatny storage dokumentów, autoryzacja, wersjonowane operacje i konflikty na poziomie egzemplarzy, eksport konta i usuwanie danych. Serwer musi weryfikować uprawnienia i oczekiwaną rewizję; frontend nie otrzyma service-role key. Testy obejmą dwóch użytkowników, próby odczytu cudzych rekordów, konflikt dwóch urządzeń, pracę offline i usuwanie konta. Konfiguracja i kod integracji powstaną w fazie 3, nie są deklarowane jako gotowe w fazie 1.

Po fazie 2 IndexedDB i BroadcastChannel obsługują lokalne karty jednego profilu przeglądarki, również offline. `pendingOperations` jest przygotowanym store, ale nie ma jeszcze serwerowego outbox ani automatycznej synchronizacji urządzeń. Ręczna wymiana odbywa się przez JSON lub arkusze. Nie zmienia to wymagań fazy 3.
