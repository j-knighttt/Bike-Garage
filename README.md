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
- **Strava**: Echte OAuth-Anbindung (Kilometer werden automatisch übernommen)
  oder Demo-Modus zum Ausprobieren ohne Account. Manuelles Nachtragen ebenfalls
  möglich.

## Architektur

```
app/                    Expo-Router-Screens (Tabs: Garage, Wartung, Strava, Profil)
  (tabs)/               Tab-Navigation
  bike/[id].tsx         Detail = digitaler Zwilling
  bike/add.tsx          Fahrrad / Komponente anlegen
src/
  domain/               Framework-unabhängige Logik (testbar)
    types.ts            Datenmodell
    componentCatalog.ts Lebensdauern, DIY-Schwierigkeit, Level-Parameter
    maintenanceEngine.ts Verschleiß- & Empfehlungs-Engine  ← Herzstück
    factories.ts        Bikes/Komponenten/Service-Intervalle erzeugen
  store/                Zustand-Store + lokale Persistenz (AsyncStorage)
  services/strava.ts    Strava OAuth + Activities + Demo-Daten
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

- [ ] Dienstleister in der Nähe finden & Reinigung/Wartung buchen (mit Preisen)
- [ ] Push-Erinnerungen für fällige Wartungen
- [ ] Marken-/Modell-spezifische Service-Intervalle automatisch befüllen
- [ ] Foto-Doku & Belege pro Komponente
- [ ] Eigenständiger Build über EAS (TestFlight)
