# Tacto Reporting – Spezifikation

**Stand:** 28.08.2026
**Repository:** github.com/nikolausridder1301/tacto
**Status:** Entwurf zur Umsetzung freigegeben (nach Anforderungsklärung mit Nikolaus)

---

## 1. Ziel

Eine schlanke, öffentlich unter GitHub Pages gehostete Web-Anwendung, die zwei Dinge zeigt:

1. **KPI-Reporting** – zentrale Kennzahlen zur Tacto-Einkaufstransformation, erfasst je Gesellschaft und Monat. Im Dashboard als konsolidierte Ist/Budget-Gegenüberstellung auf Quartalsebene (Quartal + Year-to-Date) sowie als monatlicher Trendverlauf (Ist/Forecast) über die letzten Monate.
2. **Implementierungs-Status** – Rollout-Fortschritt von Tacto je Gesellschaft und Thema/Modul (Ampel, Verantwortlicher, nächster Schritt, Termin).

Die App ist **kein** Analyse-Tool auf echten Tacto-/ERP-Procurement-Rohdaten und **keine** Live-Integration mit SharePoint, Tacto oder proALPHA. Sie ist ein eigenständiges, manuell gepflegtes Reporting-Werkzeug über den *Rollout* und die *Wirkung* von Tacto bei der SK Group.

Einzige Dateneingabe-Quelle ist Nikolaus. Er pflegt die Daten selbst (aktuell in Excel/CSV) und lädt sie regelmäßig (monatlich) über ein einfaches Upload-Dialogfenster im Dashboard hoch.

## 2. Zielgruppe

- **Datenpfleger:** Nikolaus (einzige Person, die Daten hochlädt).
- **Betrachter:** SteerCo / Ansprechpartner der Gesellschaften (HAZEMAG & EPR, HAZEMAG Systems, Allmineral, Maximator, Maximator Hydrogen, FEST, Perforator) – lesender Zugriff auf das Dashboard, kein Login-Account, nur ein gemeinsames Passwort.

## 3. Funktionsumfang (MVP)

### 3.1 Dashboard (Hauptseite, `/`)

- Kopfzeile (schwebt beim Scrollen oben, immer sichtbar): Schmidt-Kranz-Logo, Titel, "Letztes Update: [Datum, Uhrzeit]" in einer Zeile, dazu ein Export-Button und der Gesellschafts-Filter ("Gruppenebene" + je eine der 7 Gesellschaften). Der Zeitstempel stammt aus dem `Last-Modified`-Header der ausgelieferten `kpis.csv`/`status.csv` (der jüngere von beiden) – zeigt also, wann zuletzt tatsächlich neue Daten hochgeladen wurden, nicht nur das abgedeckte Quartal. Bei Auswahl einer konkreten Gesellschaft wird das Schmidt-Kranz-Logo durch deren Logo ersetzt (HAZEMAG & EPR und HAZEMAG Systems teilen sich dasselbe Logo).
- **Export:** Button mit zwei Optionen – "Als PDF exportieren" (Druckansicht der aktuellen Seite inkl. aktuell gewählter Ansicht/Filter, über den Browser-Druckdialog) und "Als Excel exportieren" (lädt die zwei hochgeladenen Rohdateien – KPIs auf Monatsbasis und Status – als eine `.xlsx`-Datei mit zwei Tabellenblättern herunter).
- **KPI-Bereich:** Tabelle mit einer Zeile je KPI (siehe Abschnitt 4.1) und einem Quartals-Filter (Dropdown, Default: neuestes vorhandenes Quartal). Die Quartalswerte sind aus den zugehörigen Monatsdaten **konsolidiert** (Summe/Ø/aktuellster Wert je nach KPI-Typ über die 3 Monate des Quartals). Für das gewählte Quartal je KPI: Ist Quartal, Budget Quartal, Delta Quartal, Ist Year to Date, Budget Year to Date, Delta Year to Date. YTD = dieselbe Konsolidierung über alle Monate desselben Jahres bis einschließlich des gewählten Quartals. Ein Toggle "Monatsdetail" blendet stattdessen eine einfache Detailtabelle ein: nur die reinen Ist-Werte, eine Spalte je vorhandenem Monat (ohne Budget/Forecast/Delta).
- **KPI-Verlauf:** Chart mit Ist-Linie (durchgezogen) sowie optional Forecast-Linie (gestrichelt) über die letzten 6 **Monate mit Ist- oder Forecast-Wert** (reine Budget-Monate zählen nicht mit; kein Budget im Chart – das steht bereits in der Tabelle und würde den Trendverlauf unnötig überladen), KPI wählbar per Dropdown. Solange es noch keine Ist-Werte gibt, zeigt der Bereich "Noch keine Ist-Werte vorhanden." Y-Achse bei Euro-KPIs kompakt in Millionen (z.B. "17 Mio. €").
- **Status-Bereich:** Matrix, Themen/Module als Zeilen, Gesellschaften als Spalten, je Zelle ein zentrierter Text-Badge (Rot → "Delayed", Gelb → "In Progress", Grün → "Done", Blau → "2. Welle" für noch nicht gestartete Themen); Verantwortlicher/nächster Schritt/Priorität/Zieltermin sowie ein optionaler Kommentar als Tooltip. In der Einzelansicht (eine Gesellschaft ausgewählt statt "Gruppenebene") kommt zusätzlich eine ausgeschriebene Spalte "Kommentare" dazu.
- Leerzustand vor dem ersten Upload: Hinweistext "Noch keine Daten hochgeladen."

### 3.2 Datenimport (Upload-Dialog)

Kein eigener Seitenwechsel: Der Link "Daten aktualisieren →" unten auf dem Dashboard öffnet ein schwebendes Dialogfenster (natives `<dialog>`-Element) direkt auf derselben Seite.

- Zwei Datei-Felder: KPI-CSV, Status-CSV (beide optional einzeln hochladbar, es kann auch nur eine der beiden Dateien aktualisiert werden).
- Button "Hochladen".
- Client-seitige Vorprüfung (Spaltennamen, Zeilenanzahl) vor dem Absenden, serverseitige Validierung im Upload-Endpunkt (siehe 7).
- Erfolgs-/Fehlermeldung nach Upload, inkl. genauer Fehlerangabe bei ungültigen Daten (Zeile/Spalte).
- Nach erfolgreichem Upload: Hinweis "Änderungen werden in ca. 1–2 Minuten live sein" (Bauzeit von GitHub Actions).
- Schließen per ✕-Button, Klick außerhalb des Dialogs oder Escape-Taste.

### 3.3 Zugriffsschutz

- Die **gesamte Seite** (Dashboard und Upload) liegt hinter einem einzigen, gemeinsamen Passwort (kein individuelles Login, kein Nutzerkonto). Siehe Abschnitt 6 zum Schutzniveau.

## 4. Datenmodell

Zwei CSV-Dateien, UTF-8 kodiert. Jeder Upload **ersetzt die jeweilige Datei vollständig** (kein Anhängen/Mergen). Historie bei den KPIs entsteht dadurch, dass Nikolaus in seiner eigenen Master-Datei alle bisherigen Monate mitführt und die komplette Historie bei jedem Upload mitschickt.

Feste Gesellschaftswerte (exakt diese Schreibweisen): `HAZEMAG & EPR`, `HAZEMAG Systems`, `Allmineral`, `Maximator`, `Maximator Hydrogen`, `FEST`, `Perforator`.

### 4.1 `kpis.csv`

Die CSV führt die KPIs auf **Monatsebene**. Das Dashboard konsolidiert daraus automatisch die Quartals- und YTD-Ansicht (siehe unten) – Nikolaus muss selbst keine Quartalswerte berechnen.

Pflichtspalten (die Spalten müssen vorhanden sein; einzelne KPI-Zellen dürfen leer bleiben, z.B. Ist-Werte für Monate, für die bisher nur das Budget feststeht):

| Spalte | Typ | Beschreibung |
|---|---|---|
| `Monat` | `YYYY-MM` | Berichtsmonat, z.B. `2027-01` |
| `Gesellschaft` | Text | einer der 7 festen Werte |
| `KPI_Bestellvolumen_EUR` | Zahl | Bestellvolumen im Monat |
| `KPI_Einsparungen_EUR` | Zahl | Realisierte Einsparungen im Monat |
| `KPI_Verhandlungen` | Zahl | Anzahl Verhandlungen im Monat |
| `KPI_Verhandlungsquote_Prozent` | Zahl | Verhandlungsquote, in % |
| `KPI_Datenqualitaet_Prozent` | Zahl | Vollständigkeit/Qualität der Tacto-Daten, in % (Stand Monatsende) |
| `KPI_Liefertreue_Prozent` | Zahl | Liefertreue, in % |
| `KPI_Mengentreue_Prozent` | Zahl | Mengentreue, in % |

Eindeutigkeit: Kombination `Monat` + `Gesellschaft` muss eindeutig sein (keine doppelten Zeilen).

**Berechnete KPI "Einsparungen / Bestellvolumen":** Steht nicht in der CSV, sondern wird im Dashboard immer als Einsparungen ÷ Bestellvolumen (in %) berechnet – für Ist und Budget, je Gesellschaft und auf Gruppenebene, jeweils aus den bereits summierten Werten des Zeitraums. Damit ist sie aus den angezeigten Zeilen direkt nachvollziehbar und auf Gruppenebene automatisch nach Bestellvolumen gewichtet.

**Forecast-/Budget-Spalten (optional):** Zu jeder `KPI_*`-Spalte können zwei gleichnamige Zusatzspalten ergänzt werden: `KPI_*_Forecast` (aktuelle Hochrechnung) und `KPI_*_Budget` (Jahresziel/Plan), jeweils auf Monatsebene. Das Dashboard stellt daraus automatisch Ist/Budget samt Delta gegenüber (Tabelle, konsolidiert auf Quartal + YTD) und Ist/Forecast als Trendlinien (Chart, Monatsebene). Vollständig optional: fehlt eine `_Forecast`- oder `_Budget`-Spalte komplett, wird für diese Kennzahl kein Vergleich angezeigt; ist die Spalte vorhanden, darf die einzelne Zelle trotzdem leer bleiben (kein Wert für diesen Monat/diese Gesellschaft, kein Validierungsfehler).

**Jahresziele als Budget:** Jahresziele werden auf Monate heruntergebrochen – Flussgrößen (Bestellvolumen, Einsparungen, Verhandlungen) gleichmäßig auf 12 Monate verteilt (Rundungsrest im Dezember, damit die Jahressumme exakt stimmt), Quoten gelten unverändert in jedem Monat. So entspricht das Budget Year to Date nach Q4 genau dem Jahresziel.

**Konsolidierung im Dashboard (nicht in der CSV):** Aus den Monatswerten werden automatisch abgeleitet:
- **Quartal:** die 3 Monate des jeweiligen Quartals, kombiniert je nach KPI-Typ.
- **Year-to-Date:** alle Monate desselben Jahres bis einschließlich des gewählten Quartals, mit derselben Kombinationslogik.

Kombinationslogik je KPI-Typ: Summe bei Flussgrößen (Bestellvolumen, Einsparungen, Verhandlungen), Durchschnitt bei Quoten (Verhandlungsquote, Liefertreue, Mengentreue), aktuellster Monatswert bei der Bestandsgröße Datenqualität; Einsparungen / Bestellvolumen wird wie oben beschrieben berechnet. Über Gesellschaften hinweg (Gruppenebene) werden Flussgrößen addiert und Quoten gemittelt – jeweils nur über die Werte, die tatsächlich vorliegen.

Beispiel (Ist + Budget; Allmineral bisher nur mit Budget):
```
Monat,Gesellschaft,KPI_Bestellvolumen_EUR,KPI_Bestellvolumen_EUR_Budget,KPI_Einsparungen_EUR,KPI_Einsparungen_EUR_Budget,KPI_Verhandlungen,KPI_Verhandlungen_Budget,KPI_Verhandlungsquote_Prozent,KPI_Verhandlungsquote_Prozent_Budget,KPI_Datenqualitaet_Prozent,KPI_Datenqualitaet_Prozent_Budget,KPI_Liefertreue_Prozent,KPI_Liefertreue_Prozent_Budget,KPI_Mengentreue_Prozent,KPI_Mengentreue_Prozent_Budget
2027-01,Maximator Hydrogen,1320000,1375000,38000,41250,2,2.5,9.8,10.7,82,85,78,80,96,97
2027-01,Allmineral,,458333,,20833,,0.42,,3.4,,80,,85,,98
```

### 4.2 `status.csv`

| Spalte | Typ | Beschreibung |
|---|---|---|
| `Gesellschaft` | Text | einer der 7 festen Werte |
| `Thema` | Text | z.B. "Analytics", "Warengruppen", "Datentransfer: lesen" |
| `Status` | Text | `Rot` / `Gelb` / `Grün` / `Blau` (Blau = "2. Welle", noch nicht gestartet) |
| `Verantwortlicher` | Text | Name/Rolle |
| `Naechster_Schritt` | Text | Freitext |
| `Prioritaet` | Text | `Hoch` / `Mittel` / `Niedrig` |
| `Zieltermin` | `YYYY-MM-DD` | optional, kann leer sein |
| `Kommentar` | Text | optionale Spalte, kann leer sein; wird im Status-Bereich als Tooltip auf dem Badge und (in der Einzelansicht) als eigene Spalte "Kommentare" angezeigt |

Eindeutigkeit: Kombination `Gesellschaft` + `Thema` muss eindeutig sein.

Beispiel:
```
Gesellschaft,Thema,Status,Verantwortlicher,Naechster_Schritt,Prioritaet,Zieltermin,Kommentar
HAZEMAG & EPR,Analytics,Gruen,N. Ridder,Laufend nutzen,Niedrig,,Funktioniert bei allen Einheiten die live sind.
Maximator,Warengruppen,Gelb,N. Ridder,Fachliche Pflege abschliessen,Mittel,2026-09-30,Muss teilweise eingeführt bzw. geprüft werden.
Perforator,Analytics,Blau,N. Ridder,Noch nicht gestartet,Niedrig,,
```

## 5. Architektur

```
Browser (Upload-Dialog im Dashboard)
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

- **Zugriffsschutz der Seite:** ein gemeinsames Passwort für das gesamte Dashboard (inkl. Upload-Dialog, da Teil derselben Seite). Es wird **client-seitig** abgefragt (kein echtes Login-System) – das ist bewusst kein starker Schutz, sondern verhindert zufälliges Auffinden/Indexierung und beiläufige Weiterverbreitung. Diese Einschränkung ist explizit akzeptiert (siehe Abschnitt 9, Risiken).
- **Upload-Endpunkt zusätzlich serverseitig geschützt:** Der Cloudflare Worker prüft das Passwort selbst (Vergleich gegen den serverseitig gespeicherten Hash), bevor er irgendetwas ins Repo schreibt. Das verhindert, dass jemand den Passwortschutz der Weboberfläche umgeht, indem er direkt den Worker-Endpunkt anspricht.
- **GitHub-Token:** fein-scoped (Fine-grained Personal Access Token), Berechtigung ausschließlich `contents:write` auf genau dieses eine Repository. Liegt ausschließlich als verschlüsseltes Secret im Cloudflare Worker, niemals im Client-Code oder im Git-Repo.
- **Datensensitivität:** Die Daten (Einsparsummen, interner Rollout-Status) gelten als **intern, aber nicht hochvertraulich** – diese Einschätzung liegt bei Nikolaus und sollte im Zweifel nochmal bestätigt werden, da die Seite trotz Passwort technisch im offenen Internet liegt.

## 7. Validierung & Fehlerbehandlung (Edge Cases)

- **Trennzeichen/Dezimaltrennzeichen:** Deutsches Excel exportiert CSV standardmäßig mit Semikolon als Trennzeichen und Komma als Dezimaltrennzeichen (z.B. `1.234,56`). Der Parser erkennt automatisch, ob Komma oder Semikolon als Trennzeichen verwendet wurde, und normalisiert Zahlenwerte (Komma → Punkt) beim Einlesen.
- **Fehlende/zusätzliche Spalten:** Wird eine Pflichtspalte nicht gefunden, bricht die Validierung mit einer klaren Fehlermeldung ab ("Spalte 'KPI_Einsparungen_EUR' fehlt"). Zusätzliche, unbekannte Spalten werden ignoriert (kein harter Fehler), damit spätere Erweiterungen nicht sofort brechen.
- **Ungültige Werte:** Nicht-numerische Werte in KPI-Spalten, ungültige Datumsformate oder unbekannte Gesellschaftsnamen führen zu einer Fehlermeldung mit Zeilennummer, **kein** Teil-Import fehlerhafter Daten.
- **Duplikate:** Doppelte Kombination `Monat`+`Gesellschaft` (bzw. `Gesellschaft`+`Thema`) wird als Validierungsfehler abgelehnt, nicht automatisch zusammengeführt.
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

- [ ] Dashboard zeigt nach Eingabe des korrekten Passworts alle KPIs mit aktuellem Quartalswert (konsolidiert aus `kpis.csv`) und Trendlinie über die letzten Monate.
- [ ] Gesellschafts-Filter schränkt sowohl KPI- als auch Status-Bereich korrekt ein.
- [ ] Status-Bereich zeigt alle Zeilen aus `status.csv`, gruppiert nach Gesellschaft, mit korrektem Status-Badge (Delayed/In Progress/Done/2. Welle).
- [ ] Upload-Dialog akzeptiert `kpis.csv` und/oder `status.csv`, prüft Passwort serverseitig, validiert Inhalt und committet nur bei vollständig gültigen Daten.
- [ ] Nach erfolgreichem Upload aktualisiert sich die öffentliche Seite innerhalb von ca. 1–2 Minuten automatisch (GitHub Actions Build).
- [ ] Fehlerhafte Uploads (falsches Format, fehlende Spalten, doppelte Zeilen) werden mit konkreter, verständlicher Fehlermeldung abgelehnt, ohne die bestehenden Live-Daten zu verändern.
- [ ] Ohne korrektes Passwort ist das Dashboard (inkl. Upload-Dialog) inhaltlich nicht einsehbar.
- [ ] "Letztes Update: [Datum, Uhrzeit]"-Hinweis auf dem Dashboard entspricht dem Zeitpunkt des letzten erfolgreichen Uploads.
- [ ] Vor dem ersten Upload zeigt das Dashboard einen klaren Leerzustand statt eines Fehlers oder leerer Diagramme.

## 11. Offene Punkte für Nikolaus

- Endgültige Bestätigung, dass die als "intern, nicht hochvertraulich" eingestuften Daten (Abschnitt 6) tatsächlich mit einfachem Passwortschutz im offenen Internet stehen dürfen.
- Erste echte Datenbefüllung von `kpis.csv` und `status.csv` (aktuell nur mit Beispielwerten spezifiziert).
- Gewünschtes gemeinsames Passwort für den Zugriffsschutz.
