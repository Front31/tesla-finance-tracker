

# Tesla API + Marktpreis-Integration + Datenbank

## Uebersicht

Die App wird von localStorage auf eine echte Datenbank migriert. Dazu kommen zwei Backend-Funktionen: eine fuer Tesla-Fahrzeugdaten und eine fuer Marktpreise via Firecrawl (mobile.de Scraping). In den Einstellungen kannst du deinen Tesla API-Token direkt in der UI eingeben.

---

## 1. Datenbank-Tabellen erstellen

Vier Tabellen werden angelegt:

**finance_config** - Finanzierungsdaten (Kaufpreis, Anzahlung, Rate, etc.)
- id, purchase_price, down_payment, financed_amount, start_date, duration_months, monthly_rate, interest_rate, vehicle_model, vehicle_trim, vehicle_year, vin, created_at, updated_at

**payments** - Zahlungshistorie (CRUD)
- id, date, amount, type (rate/sondertilgung/gebuehr/sonstiges), note, created_at

**tesla_vehicle_state** - Fahrzeugdaten aus Tesla API
- id, vin, model, trim, year, odometer_km, last_sync_at, raw_json, tesla_access_token (verschluesselt gespeichert)

**market_price_daily** - Taegliche Marktpreise
- id, date (unique), avg_price_eur, min_price_eur, max_price_eur, sample_size, filters_used (jsonb), source, fetched_at

Alle Tabellen ohne RLS (Single-User-App ohne Auth vorerst).

---

## 2. Firecrawl Connector einrichten

Der Firecrawl Connector wird aktiviert, damit die Edge Function auf den API-Key zugreifen kann. Du wirst aufgefordert, eine Firecrawl-Verbindung auszuwaehlen oder neu zu erstellen.

---

## 3. Edge Function: Marktpreis-Fetch

**`fetch-market-prices`** - Wird manuell oder per Cron aufgerufen:

- Liest `finance_config` aus der DB (Model, Trim, Year, Kilometerstand)
- Baut eine mobile.de Such-URL mit passenden Filtern (Model 3, Long Range, Baujahr +/-1, km +/-15.000)
- Ruft Firecrawl Scrape API auf, um die Listings-Seite zu scrapen
- Parst die Preise aus dem Markdown-Ergebnis
- Bereinigt Ausreisser (5%/95% Quantil entfernen)
- Berechnet Durchschnitt, Min, Max, Anzahl
- Speichert den Tageswert in `market_price_daily`

---

## 4. Edge Function: Tesla-Sync

**`sync-tesla-vehicle`** - Holt Fahrzeugdaten ueber die Tesla Fleet API:

- Liest den Tesla Access Token aus `tesla_vehicle_state`
- Ruft Tesla Fleet API Endpunkte auf (Vehicle Data -> Odometer)
- Speichert aktuellen Kilometerstand + Sync-Zeitpunkt in `tesla_vehicle_state`
- Bei Fehler: letzten bekannten Wert beibehalten, Fehlermeldung loggen

---

## 5. UI: Einstellungsbereich fuer Tesla API Token

Der bestehende `FinanceSettings`-Dialog bekommt einen neuen Bereich:

- **Tesla API Verbindung**: Eingabefeld fuer den Tesla Access Token
- "Verbinden"-Button speichert den Token in `tesla_vehicle_state`
- "Sync jetzt"-Button ruft die `sync-tesla-vehicle` Edge Function auf
- Status-Anzeige: "Verbunden" / "Nicht verbunden" + letzter Sync-Zeitpunkt

---

## 6. Frontend: Migration von localStorage auf Datenbank

Der `useFinanceData` Hook wird umgebaut:

- Statt localStorage werden alle Daten per Supabase Client gelesen/geschrieben
- `finance_config`: Laden beim Start, Speichern bei Aenderungen
- `payments`: CRUD-Operationen gegen die DB
- `tesla_vehicle_state`: Lesen aus DB (geschrieben von Edge Function)
- `market_price_daily`: Lesen der letzten 30/90 Tage fuer Chart + KPI
- Loading States und Error Handling hinzufuegen

---

## 7. UI: Marktpreis manuell aktualisieren

- Button "Marktpreis aktualisieren" im Dashboard oder in den Einstellungen
- Ruft die `fetch-market-prices` Edge Function auf
- Zeigt Ladeindikator und Ergebnis-Toast

---

## Technische Details

```text
Frontend (React)
    |
    +-- useFinanceData Hook
    |       |-- Supabase Client (finance_config, payments)
    |       |-- Supabase Client (tesla_vehicle_state - read)
    |       |-- Supabase Client (market_price_daily - read)
    |
    +-- Settings UI
    |       |-- Tesla Token eingeben -> DB speichern
    |       |-- "Sync jetzt" -> Edge Function aufrufen
    |
    +-- "Marktpreis aktualisieren" Button
            |-- Edge Function aufrufen

Edge Functions
    |
    +-- sync-tesla-vehicle
    |       |-- Token aus DB lesen
    |       |-- Tesla Fleet API aufrufen
    |       |-- Ergebnis in DB schreiben
    |
    +-- fetch-market-prices
            |-- Config aus DB lesen
            |-- mobile.de URL bauen
            |-- Firecrawl API (Scrape) aufrufen
            |-- Preise parsen + bereinigen
            |-- Ergebnis in DB schreiben
```

### Reihenfolge der Implementierung

1. Datenbank-Tabellen erstellen (Migration)
2. Firecrawl Connector aktivieren
3. Edge Function `fetch-market-prices` erstellen
4. Edge Function `sync-tesla-vehicle` erstellen
5. `useFinanceData` Hook auf Supabase umstellen
6. Settings-UI erweitern (Tesla Token Eingabe)
7. "Marktpreis aktualisieren" Button hinzufuegen
8. Testen

