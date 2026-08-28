# Tacto Reporting – Kurzanleitung

Für die Bedienung der laufenden Seite. Technischer Hintergrund: [SPEC.md](SPEC.md), [README.md](README.md).

## Wo ist was?

- **Dashboard:** die Hauptseite, z.B. `https://nikolausridder1301.github.io/tacto/`
- **Daten aktualisieren:** über den Link "Daten aktualisieren →" unten auf dem Dashboard, oder direkt `.../tacto/upload.html`

Beide Seiten sind mit demselben Passwort geschützt.

## Daten aktualisieren

1. Upload-Seite öffnen, Passwort eingeben.
2. Eine oder beide Dateien auswählen: `kpis.csv` (KPI-Zahlen) und/oder `status.csv` (Implementierungs-Status). Vorlagen dafür liegen im Repo unter [templates/](templates/).
3. Auf "Hochladen" klicken.
4. Nach ein bis zwei Minuten ist die Änderung live (die Seite baut sich automatisch neu).

**Wenn eine Fehlermeldung erscheint:** Die Datei wurde noch NICHT übernommen – die aktuell sichtbaren Daten bleiben unverändert. Meist steht in der Meldung, welche Zeile/Spalte das Problem hat (z.B. falsches Datumsformat, unbekannte Gesellschaft, doppelte Zeile). Datei korrigieren und erneut hochladen.

**Erwartetes Format:** UTF-8-CSV, egal ob mit Komma oder Semikolon getrennt (deutsches Excel-Format wird automatisch erkannt). Jede Zeile in `kpis.csv` braucht eine eindeutige Kombination aus Monat (Format `YYYY-MM`, z.B. `2026-09`) und Gesellschaft; jede Zeile in `status.csv` eine eindeutige Kombination aus Gesellschaft und Thema. Gültige Gesellschaften: `HAZEMAG`, `Allmineral`, `Hazemag Systems`, `Maximator`, `Maximator Hydrogen`, `FEST`.

Die Zahlen kommen monatlich in die CSV – das Dashboard fasst sie selbst zu Quartals- und Year-to-Date-Werten zusammen (Tabelle) und zeigt zusätzlich die letzten 6 Monate im Zeitverlauf (Chart). Es muss also nichts manuell zu Quartalen aufsummiert werden.

**Forecast-/Budget-Werte (optional):** Sobald ihr Hochrechnungs- bzw. Budget-Werte je KPI habt, könnt ihr sie in `kpis.csv` als zusätzliche `..._Forecast`- und `..._Budget`-Spalten ergänzen (z.B. `KPI_Einkaufsvolumen_EUR_Forecast`, `KPI_Einkaufsvolumen_EUR_Budget`, siehe Vorlage in [templates/kpis.csv](templates/kpis.csv)), ebenfalls auf Monatsebene. Die Tabelle stellt Ist automatisch dem Budget gegenüber (inkl. Delta, je Quartal und Year-to-Date, konsolidiert aus den Monatswerten); der Forecast erscheint zusätzlich als eigene Linie im Chart. Ohne diese Spalten funktioniert alles wie bisher, nur ohne Forecast-/Budget-Vergleich.

## Passwort ändern

Kein Code-Change nötig, nur ein GitHub-Secret aktualisieren:

1. Neues Passwort ausdenken und daraus den Hash erzeugen (z.B. lokal im Terminal):
   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('DEIN-NEUES-PASSWORT').digest('hex'))"
   ```
2. Im Repo: **Settings → Secrets and variables → Actions → Secrets** → `SITE_PASSWORD_HASH` → **Update** → den erzeugten Hash einfügen.
3. **Actions**-Tab → Workflow "Deploy Dashboard" → **Run workflow**, um die Seite mit dem neuen Passwort neu zu bauen (kein Code-Commit nötig).

Nach ca. 1–2 Minuten gilt das neue Passwort.

## Upload-Funktion aktivieren (einmalig)

Die Upload-Seite braucht einen einmalig eingerichteten Cloudflare Worker im Hintergrund (Details: [README.md](README.md#deployment)). Solange das nicht eingerichtet ist, zeigt die Upload-Seite die Meldung "Kein Upload-Endpunkt konfiguriert" – das Dashboard selbst funktioniert davon unabhängig.
