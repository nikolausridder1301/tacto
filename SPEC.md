# Tacto Reporting – Spezifikation

**Stand:** 28.08.2026
**Repository:** github.com/nikolausridder1301/tacto
**Status:** Entwurf zur Umsetzung freigegeben (nach Anforderungsklärung mit Nikolaus)

---

## 1. Ziel

Eine schlanke, öffentlich unter GitHub Pages gehostete Web-Anwendung, die zwei Dinge zeigt:

1. **KPI-Reporting** – zentrale Kennzahlen zur Tacto-Einkaufstransformation, je Gesellschaft und Quartal, als Ist/Forecast/Budget-Gegenüberstellung (Quartal + Year-to-Date) und als Trendverlauf über die Quartale.
2. **Implementierungs-Status** – Rollout-Fortschritt von Tacto je Gesellschaft und Thema/Modul (Ampel, Verantwortlicher, nächster Schritt, Termin).

Die App ist **kein** Analyse-Tool auf echten Tacto-/ERP-Procurement-Rohdaten und **keine** Live-Integration mit SharePoint, Tacto oder proALPHA. Sie ist ein eigenständiges, manuell gepflegtes Reporting-Werkzeug über den *Rollout* und die *Wirkung* von Tacto bei der SK Group.

Einzige Dateneingabe-Quelle ist Nikolaus. Er pflegt die Daten selbst (aktuell in Excel/CSV) und lädt sie regelmäßig (quartalsweise) über eine einfache Upload-Seite hoch.

## 2. Zielgruppe

- **Datenpfleger:** Nikolaus (einzige Person, die Daten hochlädt).
- **Betrachter:** SteerCo / Ansprechpartner der Gesellschaften (HAZEMAG, Allmineral, Hazemag Systems, Maximator, Maximator Hydrogen, FEST) – lesender Zugriff auf das Dashboard, kein Login-Account, nur ein gemeinsames Passwort.

## 3. Funktionsumfang (MVP)

### 3.1 Dashboard (Hauptseite, `/`)

- Kopfzeile mit Schmidt-Kranz-Logo (immer sichtbar), Titel und einem Gesellschafts-Filter (Dropdown: "Alle" + je eine der 6 Gesellschaften). Bei Auswahl einer konkreten Gesellschaft erscheint zusätzlich deren Logo (HAZEMAG und Hazemag Systems teilen sich dasselbe Logo).
- **KPI-Bereich:** Tabelle mit einer Zeile je KPI (siehe Abschnitt 4.1) und einem Quartals-Filter (Dropdown, Default: neuestes vorhandenes Quartal). Für das gewählte Quartal je KPI: Ist Quartal, Budget Quartal, Delta Quartal, Ist Year to Date, Budget Year to Date, Delta Year to Date. YTD = Summe/Ø/aktuellster Wert (je nach KPI-Typ) aller Quartale desselben Jahres bis einschließlich des gewählten Quartals.
- **KPI-Verlauf:** Chart mit Ist-Linie (durchgezogen) sowie optional Forecast-Linie (gestrichelt) über alle vorhandenen Quartale (reine Quartalswerte, keine YTD-Kumulation im Chart, kein Budget – das steht bereits in der Tabelle und würde den Trendverlauf im Chart unnötig überladen), KPI wählbar per Dropdown. Y-Achse bei Euro-KPIs kompakt in Millionen (z.B. "17 Mio. €").
- **Status-Bereich:** Matrix, Themen/Module als Zeilen, Gesellschaften als Spalten, mit Ampel-Farbe (Rot/Gelb/Grün); Verantwortlicher/nächster Schritt/Priorität/Zieltermin als Tooltip.
- Sichtbarer Hinweis "Stand: [neuestes Quartal]" oben auf der Seite, damit Betrachter die Aktualität der Daten einschätzen können.
- Leerzustand vor dem ersten Upload: Hinweistext "Noch keine Daten hochgeladen."

### 3.2 Upload-Seite (`/upload`)

- Zwei Datei-Felder: KPI-CSV, Status-CSV (beide optional einzeln hochladbar, es kann auch nur eine der beiden Dateien aktualisiert werden).
- Button "Hochladen".
- Client-seitige Vorprüfung (Spaltennamen, Zeilenanzahl) vor dem Absenden, serverseitige Validierung im Upload-Endpunkt (siehe 7).
- Erfolgs-/Fehlermeldung nach Upload, inkl. genauer Fehlerangabe bei ungültigen Daten (Zeile/Spalte).
- Nach erfolgreichem Upload: Hinweis "Änderungen werden in ca. 1–2 Minuten live sein" (Bauzeit von GitHub Actions).

### 3.3 Zugriffsschutz

- Die **gesamte Seite** (Dashboard und Upload) liegt hinter einem einzigen, gemeinsamen Passwort (kein individuelles Login, kein Nutzerkonto). Siehe Abschnitt 6 zum Schutzniveau.

## 4. Datenmodell

Zwei CSV-Dateien, UTF-8 kodiert. Jeder Upload **ersetzt die jeweilige Datei vollständig** (kein Anhängen/Mergen). Historie bei den KPIs entsteht dadurch, dass Nikolaus in seiner eigenen Master-Datei alle bisherigen Quartale mitführt und die komplette Historie bei jedem Upload mitschickt.

Feste Gesellschaftswerte (exakt diese Schreibweisen, aus der Projektzusammenfassung): `HAZEMAG`, `Allmineral`, `Hazemag Systems`, `Maximator`, `Maximator Hydrogen`, `FEST`.

### 4.1 `kpis.csv`

Pflichtspalten:

| Spalte | Typ | Beschreibung |
|---|---|---|
| `Quartal` | `YYYY-Qn` | Berichtsquartal, z.B. `2026-Q3` (Q1–Q4) |
| `Gesellschaft` | Text | einer der 6 festen Werte |
| `KPI_Einkaufsvolumen_EUR` | Zahl | Einkaufsvolumen im Quartal |
| `KPI_Einsparung_Quartal_EUR` | Zahl | Realisierte Einsparung im Quartal |
| `KPI_Einsparquote_Prozent` | Zahl | Einsparung / Einkaufsvolumen, in % |
| `KPI_Zeitersparnis_Std` | Zahl | Zeitersparnis in Stunden im Quartal |
| `KPI_RFQs_Abgeschlossen` | Ganzzahl | Anzahl abgeschlossener RFQs/Ausschreibungen im Quartal |
| `KPI_Aktive_Lieferanten` | Ganzzahl | Anzahl aktiver Lieferanten in Tacto (Stand Quartalsende) |
| `KPI_Datenqualitaet_Prozent` | Zahl | Vollständigkeit/Qualität der Tacto-Daten, in % (Stand Quartalsende) |
| `KPI_Aktive_Nutzer` | Ganzzahl | Anzahl aktiver Nutzer (Stand Quartalsende) |

Eindeutigkeit: Kombination `Quartal` + `Gesellschaft` muss eindeutig sein (keine doppelten Zeilen).

**Forecast-/Budget-Spalten (optional):** Zu jeder `KPI_*`-Spalte können zwei gleichnamige Zusatzspalten ergänzt werden: `KPI_*_Forecast` (aktuelle Hochrechnung) und `KPI_*_Budget` (ursprünglicher Jahresplan). Das Dashboard stellt daraus automatisch Ist/Forecast/Budget samt Deltas gegenüber – in der Tabelle als eigene Spalten, im Chart als zusätzliche Linien. Vollständig optional: fehlt eine `_Forecast`- oder `_Budget`-Spalte komplett, wird für diese Kennzahl kein Vergleich angezeigt; ist die Spalte vorhanden, darf die einzelne Zelle trotzdem leer bleiben (kein Wert für dieses Quartal/diese Gesellschaft, kein Validierungsfehler).

**YTD-Berechnung (im Dashboard, nicht in der CSV):** Für ein gewähltes Quartal wird Year-to-Date automatisch aus allen Quartalen desselben Jahres bis einschließlich des gewählten Quartals berechnet – als Summe bei Flussgrößen (Einkaufsvolumen, Einsparung, Zeitersparnis, RFQs), als Durchschnitt bei der Einsparquote, als aktuellster Wert bei Bestandsgrößen (Aktive Lieferanten, Datenqualität, Aktive Nutzer – diese lassen sich nicht sinnvoll über Quartale aufsummieren).

Beispiel (mit Forecast-/Budget-Spalten):
```
Quartal,Gesellschaft,KPI_Einkaufsvolumen_EUR,KPI_Einkaufsvolumen_EUR_Forecast,KPI_Einkaufsvolumen_EUR_Budget,KPI_Einsparung_Quartal_EUR,KPI_Einsparung_Quartal_EUR_Forecast,KPI_Einsparung_Quartal_EUR_Budget,KPI_Einsparquote_Prozent,KPI_Einsparquote_Prozent_Forecast,KPI_Einsparquote_Prozent_Budget,KPI_Zeitersparnis_Std,KPI_Zeitersparnis_Std_Forecast,KPI_Zeitersparnis_Std_Budget,KPI_RFQs_Abgeschlossen,KPI_RFQs_Abgeschlossen_Forecast,KPI_RFQs_Abgeschlossen_Budget,KPI_Aktive_Lieferanten,KPI_Aktive_Lieferanten_Forecast,KPI_Aktive_Lieferanten_Budget,KPI_Datenqualitaet_Prozent,KPI_Datenqualitaet_Prozent_Forecast,KPI_Datenqualitaet_Prozent_Budget,KPI_Aktive_Nutzer,KPI_Aktive_Nutzer_Forecast,KPI_Aktive_Nutzer_Budget
2026-Q3,Maximator,8700000,8787000,9050610,38000,60000,69000,1.3,1.5,1.7,97,90,103,5,6,7,85,100,115,78,80,92,6,8,9
2026-Q3,HAZEMAG,3600000,3636000,3745080,0,60000,69000,0,1.5,1.7,10,90,103,0,6,7,40,100,115,40,80,92,2,8,9
```

### 4.2 `status.csv`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `Gesellschaft` | Text | einer der 6 festen Werte |
| `Thema` | Text | z.B. "Auftragsbestätigungen", "Warengruppen", "Echtdatentransfer" |
| `Status` | Text | `Rot` / `Gelb` / `Grün` |
| `Verantwortlicher` | Text | Name/Rolle |
| `Naechster_Schritt` | Text | Freitext |
| `Prioritaet` | Text | `Hoch` / `Mittel` / `Niedrig` |
| `Zieltermin` | `YYYY-MM-DD` | optional, kann leer sein |

Eindeutigkeit: Kombination `Gesellschaft` + `Thema` muss eindeutig sein.

Beispiel:
```
Gesellschaft,Thema,Status,Verantwortlicher,Naechster_Schritt,Prioritaet,Zieltermin
HAZEMAG,Auftragsbestaetigungen,Gelb,N. Ridder,ERP-Integration mit proALPHA klären,Hoch,2026-10-15
Maximator,Warengruppen,Gruen,N. Ridder,Fachliche Pflege abschliessen,Mittel,2026-09-30
Allmineral,Datenanbindung,Rot,N. Ridder,Workspace mit echten Daten befüllen,Hoch,2026-10-01
```

## 5. Architektur

```
Browser (Upload-Seite)
   │  Passwort + CSV-Dateien
   ▼
Cloudflare Worker (serverloser Endpunkt, kostenlos)
   │  prüft Passwort serverseitig, validiert CSV-Inhalt
   │  schreibt Dateien via GitHub Contents API
   ▼
GitHub Repo (nikolausridder1301/tacto), Ordner /data/
   │  Push löst GitHub Actions Workflow aus
   ▼
GitHub Actions: baut statische Seite (liest /data/*.csv, generiert Charts/Tabellen)
   ▼
GitHub Pages (öffentlich erreichbar, Passwort-Gate im Frontend)
```

- **Frontend:** statisches HTML/CSS/JS, gebaut aus den CSV-Daten zum Zeitpunkt des GitHub-Actions-Laufs (kein Client-seitiges Nachladen der Rohdaten nötig – Daten werden zu JSON verarbeitet und in die Seite eingebettet). Charts über eine leichte JS-Chart-Bibliothek.
- **Backend (nur für Upload):** ein einzelner Cloudflare Worker. Hält zwei Secrets: einen fein-scoped GitHub Personal Access Token (nur `contents:write` auf dieses eine Repository) und den Passwort-Hash für den Zugriffsschutz. Kein Datenbankspeicher – die CSV-Dateien im Git-Repo sind die einzige Datenhaltung.
- **Hosting-Kosten:** 0 € (GitHub Pages + Actions + Cloudflare Workers Free Tier decken diesen Anwendungsfall vollständig ab).

## 6. Sicherheit

- **Zugriffsschutz der Seite:** ein gemeinsames Passwort für Dashboard und Upload-Seite. Es wird **client-seitig** abgefragt (kein echtes Login-System) – das ist bewusst kein starker Schutz, sondern verhindert zufälliges Auffinden/Indexierung und beiläufige Weiterverbreitung. Diese Einschränkung ist explizit akzeptiert (siehe Abschnitt 9, Risiken).
- **Upload-Endpunkt zusätzlich serverseitig geschützt:** Der Cloudflare Worker prüft das Passwort selbst (Vergleich gegen den serverseitig gespeicherten Hash), bevor er irgendetwas ins Repo schreibt. Das verhindert, dass jemand den Passwortschutz der Weboberfläche umgeht, indem er direkt den Worker-Endpunkt anspricht.
- **GitHub-Token:** fein-scoped (Fine-grained Personal Access Token), Berechtigung ausschließlich `contents:write` auf genau dieses eine Repository. Liegt ausschließlich als verschlüsseltes Secret im Cloudflare Worker, niemals im Client-Code oder im Git-Repo.
- **Datensensitivität:** Die Daten (Einsparsummen, interner Rollout-Status) gelten als **intern, aber nicht hochvertraulich** – diese Einschätzung liegt bei Nikolaus und sollte im Zweifel nochmal bestätigt werden, da die Seite trotz Passwort technisch im offenen Internet liegt.

## 7. Validierung & Fehlerbehandlung (Edge Cases)

- **Trennzeichen/Dezimaltrennzeichen:** Deutsches Excel exportiert CSV standardmäßig mit Semikolon als Trennzeichen und Komma als Dezimaltrennzeichen (z.B. `1.234,56`). Der Parser erkennt automatisch, ob Komma oder Semikolon als Trennzeichen verwendet wurde, und normalisiert Zahlenwerte (Komma → Punkt) beim Einlesen.
- **Fehlende/zusätzliche Spalten:** Wird eine Pflichtspalte nicht gefunden, bricht die Validierung mit einer klaren Fehlermeldung ab ("Spalte 'KPI_Einsparung_Quartal_EUR' fehlt"). Zusätzliche, unbekannte Spalten werden ignoriert (kein harter Fehler), damit spätere Erweiterungen nicht sofort brechen.
- **Ungültige Werte:** Nicht-numerische Werte in KPI-Spalten, ungültige Datumsformate oder unbekannte Gesellschaftsnamen führen zu einer Fehlermeldung mit Zeilennummer, **kein** Teil-Import fehlerhafter Daten.
- **Duplikate:** Doppelte Kombination `Quartal`+`Gesellschaft` (bzw. `Gesellschaft`+`Thema`) wird als Validierungsfehler abgelehnt, nicht automatisch zusammengeführt.
- **Leere Datei / nur ein File hochgeladen:** zulässig – die jeweils andere Datei bleibt unverändert.
- **Sehr große Datei / offensichtlich falsche Datei (z.B. .xlsx statt .csv):** wird vor dem Absenden client-seitig anhand der Dateiendung/Größe abgefangen (max. 2 MB, Endung `.csv`).
- **Erstzustand ohne Daten:** Dashboard zeigt Leerzustand-Hinweis statt leerer/kaputter Charts.

## 8. Nicht-Ziele (explizit außerhalb des MVP-Scopes)

- Keine Live-Anbindung an SharePoint, Tacto oder ERP/proALPHA.
- Keine Mehrbenutzer-Verwaltung, keine individuellen Accounts/Rollen.
- Keine automatisierte Prüfung der fachlichen Richtigkeit der eingegebenen Zahlen (nur Formatvalidierung, keine Plausibilitätsprüfung).
- Kein Tracking unterhalb der Ebene "Gesellschaft + Thema" (z.B. keine einzelnen Aufgaben/Tickets je Thema).
- Keine mobile-optimierte Gestaltung als hartes Kriterium (funktioniert im Browser, aber kein Design-Fokus auf Smartphones).

## 9. Risiken & Tradeoffs

| Risiko | Einschätzung | Umgang |
|---|---|---|
| Client-seitiges Passwort ist technisch umgehbar für versierte Nutzer | Mittel | Bewusst akzeptiert für "niedrige Hürde"-Zweck; kein Ersatz für echten Zugriffsschutz bei hochsensiblen Daten |
| Datenqualität hängt vollständig von manueller Pflege durch eine Person ab | Mittel | Keine Gegenprüfung vorgesehen; Formatvalidierung fängt nur technische, keine fachlichen Fehler ab |
| Verfügbarkeit hängt an GitHub Pages/Actions/Cloudflare (kostenlose Fremddienste) | Niedrig | Alle drei Dienste sind etabliert und kostenlos in diesem Umfang; kein SLA, aber für internen Reporting-Zweck ausreichend |
| Single Point of Failure: nur Nikolaus kann Daten pflegen | Mittel | Bewusste Entscheidung laut Anforderung ("Daten kommen nur von mir") |
| Öffentliche Erreichbarkeit trotz Passwort, falls Link weitergegeben wird | Mittel | Siehe Abschnitt 6; Passwort sollte bei Bedarf rotiert werden können |

## 10. Akzeptanzkriterien

- [ ] Dashboard zeigt nach Eingabe des korrekten Passworts alle KPIs mit aktuellem Wert und Trendlinie über die in `kpis.csv` vorhandenen Quartale.
- [ ] Gesellschafts-Filter schränkt sowohl KPI- als auch Status-Bereich korrekt ein.
- [ ] Status-Bereich zeigt alle Zeilen aus `status.csv`, gruppiert nach Gesellschaft, mit korrekter Ampel-Farbe.
- [ ] Upload-Seite akzeptiert `kpis.csv` und/oder `status.csv`, prüft Passwort serverseitig, validiert Inhalt und committet nur bei vollständig gültigen Daten.
- [ ] Nach erfolgreichem Upload aktualisiert sich die öffentliche Seite innerhalb von ca. 1–2 Minuten automatisch (GitHub Actions Build).
- [ ] Fehlerhafte Uploads (falsches Format, fehlende Spalten, doppelte Zeilen) werden mit konkreter, verständlicher Fehlermeldung abgelehnt, ohne die bestehenden Live-Daten zu verändern.
- [ ] Ohne korrektes Passwort ist weder das Dashboard noch die Upload-Seite inhaltlich einsehbar.
- [ ] "Stand: [Datum]"-Hinweis auf dem Dashboard entspricht dem Zeitpunkt des letzten erfolgreichen Uploads.
- [ ] Vor dem ersten Upload zeigt das Dashboard einen klaren Leerzustand statt eines Fehlers oder leerer Diagramme.

## 11. Offene Punkte für Nikolaus

- Endgültige Bestätigung, dass die als "intern, nicht hochvertraulich" eingestuften Daten (Abschnitt 6) tatsächlich mit einfachem Passwortschutz im offenen Internet stehen dürfen.
- Erste echte Datenbefüllung von `kpis.csv` und `status.csv` (aktuell nur mit Beispielwerten spezifiziert).
- Gewünschtes gemeinsames Passwort für den Zugriffsschutz.
