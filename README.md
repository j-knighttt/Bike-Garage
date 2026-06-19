# 🚲 Bike Garage

Eine iPhone-App (Expo / React Native), die deine **Strava-Kilometer** mit einem
**digitalen Zwilling** deines Fahrrads verbindet und daraus konkrete
**Pflege-, Wartungs- und Service-Empfehlungen** ableitet – passend zu deinem
Können (Anfänger / Fortgeschritten / Profi) und den Hersteller-Vorgaben für
Garantie und Service.

> Status: **v0.1 – Fundament**. Kern steht: digitaler Zwilling, Verschleiß- &
> Wartungs-Engine, Level-Logik, Strava-Anbindung (echt + Demo-Modus).
> Geplant: Buchung von Dienstleistern in der Nähe, Preisübersicht, Reminder/Push.

## Was die App heute kann

- **Garage**: Mehrere Fahrräder anlegen, je mit Marke/Modell/Typ und – bei
  Gebrauchträdern – geschätztem Anfangszustand der Komponenten.
- **Digitaler Zwilling**: Pro Fahrrad alle relevanten Komponenten (Kette,
  Kassette, Reifen, Bremsbeläge, Lager, Lenkerband, …) mit realistischen
  Lebensdauern und individuellem Verschleißzustand.
- **Verschleiß-Engine**: Berechnet aus gefahrenen Kilometern + Zeit + Zustand,
  wie weit jede Komponente „durch" ist – inkl. Restreichweite in km/Monaten.
- **Empfehlungen nach Level**: Anfänger werden früher gewarnt und öfter in die
  Werkstatt geschickt; Profis erledigen das meiste selbst und bekommen knappere,
  spätere Hinweise.
- **Pflege-Zyklen**: Antrieb schmieren, Grundreinigung, professioneller Service –
  Intervalle passen sich Level und nassen Fahrten an.
- **Hersteller-Service & Garantie**: Erstinspektion, Jahresinspektion und großer
  Service als garantierelevante Checkpoints.
- **Strava**: Echte OAuth-Anbindung mit automatischem Token-Refresh (Kilometer
  und Höhenmeter werden übernommen) oder Demo-Modus zum Ausprobieren ohne
  Account. Manuelles Nachtragen ebenfalls möglich.
- **Fahrten ↔ Räder**: Strava-Räder (Gear) lassen sich deinen Garagen-Rädern
  zuordnen; bei einem Rad läuft alles automatisch dorthin, bei mehreren gibt es
  ein Standard-Rad und eine schnelle Zuordnung einzelner Fahrten. Kilometer
  landen so beim richtigen Rad und treiben dessen Verschleiß an.
- **Erinnerungen**: Lokale Push-Mitteilungen aufs iPhone – ein wöchentlicher
  Wartungs-Check plus ein Hinweis, sobald nach einer Fahrt etwas fällig wird.
- **Statistik**: Strava-artige Auswertung – Distanz, Höhenmeter, Fahrten und
  Fahrzeit pro **Woche / Monat / Jahr / Gesamt**, Vergleich zur Vorperiode
  (+/- %), umschaltbares Trend-Diagramm (km ⇄ Höhenmeter), Aufschlüsselung pro
  Fahrrad sowie Highlights (längste Fahrt, Ø-Geschwindigkeit).
- **Werkstatt & Pflege**: Dienstleister in der Nähe (Werkstätten, mobile
  Mechaniker, Reinigungen) – sortiert nach **Entfernung** (Standort), filterbar
  nach Leistung, mit **öffentlichen Preisen**, Kontaktaktionen (anrufen, Route,
  Website) und **Terminanfragen**, die unter „Meine Termine" verwaltet werden.
  Aus jeder „Werkstatt empfohlen"-Wartung führt ein direkter Sprung dorthin.

## Architektur

```
app/                    Expo-Router-Screens
  (tabs)/               Tabs: Garage, Wartung, Statistik, Werkstatt, Strava, Profil
  bike/[id].tsx         Detail = digitaler Zwilling
  bike/add.tsx          Fahrrad / Komponente anlegen
  provider/[id].tsx     Dienstleister-Detail (Leistungen, Preise, Termin)
src/
  domain/               Framework-unabhängige Logik (testbar)
    types.ts            Datenmodell
    componentCatalog.ts Lebensdauern, DIY-Schwierigkeit, Level-Parameter
    maintenanceEngine.ts Verschleiß- & Empfehlungs-Engine  ← Herzstück
    stats.ts            Fahr-Statistiken (Woche/Monat/Jahr, Trends, Vergleich)
    providers.ts        Dienstleister, Preise, Distanz, Buchungen
    factories.ts        Bikes/Komponenten/Service-Intervalle erzeugen
  store/                Zustand-Store + lokale Persistenz (AsyncStorage)
    rideAssignment.ts   Fahrten den richtigen Rädern zuordnen (testbar)
  services/strava.ts    Strava OAuth + Token-Refresh + Activities + Gear + Demo
  services/notifications.ts  Lokale Wartungs-Erinnerungen (expo-notifications)
  hooks/useUserLocation.ts  Standort (expo-location) mit Fallback
  components/, theme/    UI-Bausteine
```

Die Domänen-Logik ist bewusst von React/Expo getrennt, damit die Engine isoliert
getestet werden kann.

## Loslegen

```bash
npm install
npm start          # Expo Dev Server – dann "Expo Go" auf dem iPhone scannen
npm run typecheck  # TypeScript prüfen
npm test           # Engine-Checks (Verschleiß, Level-Logik, DIY/Werkstatt)
```

Auf dem iPhone: kostenlose **Expo Go**-App installieren, QR-Code scannen.
Für eine eigenständige App (TestFlight/App Store) später `eas build`.

## Strava einrichten (optional)

Ohne Zugangsdaten läuft die App im **Demo-Modus** (synthetische Fahrten, die
echt in die Wartungsplanung einfließen). Für echte Strava-Daten:

1. Unter https://www.strava.com/settings/api eine API-Anwendung anlegen.
2. Als „Authorization Callback Domain" den Expo-Redirect hinterlegen.
3. Credentials als Umgebungsvariablen setzen (z. B. in `.env`):

   ```
   EXPO_PUBLIC_STRAVA_CLIENT_ID=12345
   EXPO_PUBLIC_STRAVA_CLIENT_SECRET=dein_secret
   ```

> Hinweis: Das Client-Secret im Client zu halten ist nur für den persönlichen
> Gebrauch okay. Für eine veröffentlichte App sollte der Token-Tausch über einen
> kleinen Backend-Dienst laufen.

## Roadmap

- [x] Dienstleister in der Nähe finden, Preise, Terminanfragen
- [x] Lokale Push-Erinnerungen für fällige Wartungen
- [x] Strava-Fahrten einzelnen Rädern zuordnen (Gear-Mapping)
- [ ] Echte Anbieter-Daten/-Buchung über Partner-API (statt Demo-Verzeichnis)
- [ ] Remote-Push über Backend (statt nur lokale Erinnerungen)
- [ ] Marken-/Modell-spezifische Service-Intervalle automatisch befüllen
- [ ] Foto-Doku & Belege pro Komponente
- [ ] Eigenständiger Build über EAS (TestFlight)
