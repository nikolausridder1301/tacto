# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Befehle

- `npm install` – alle Workspaces installieren (funktioniert plattformübergreifend, auch Windows-ARM64)
- `npm run dev` – Dashboard lokal starten (packages/site, Vite-Dev-Server)
- `npm test` – alle Tests im Monorepo ausführen (aktuell packages/csv, packages/worker)
- `npm test --workspace=packages/csv` – Tests nur eines einzelnen Pakets
- `npm run build` – Produktions-Build der statischen Seite (packages/site/dist)

**Framework:** TypeScript-Monorepo mit npm Workspaces. Statische Seite mit Vite (vanilla TS, kein UI-Framework), Tests mit Vitest, Backend-Endpunkt als Cloudflare Worker.

## Architektur

Drei Pakete, eine gemeinsame Datenlogik:

- `packages/csv` – Parsing/Validierung für `kpis.csv` und `status.csv` (SPEC.md Abschnitt 4). Einzige Quelle der Wahrheit für das Datenschema, wird als `@tacto/csv` sowohl von `site` als auch von `worker` importiert.
- `packages/site` – statisches Dashboard (Vite), gebaut aus `/data/*.csv` und deployed auf GitHub Pages über `.github/workflows/deploy.yml`.
- `packages/worker` – Cloudflare Worker, nimmt CSV-Uploads entgegen, validiert sie über `@tacto/csv` und committet sie ins Repo. Bewusst **kein** `wrangler` als Projektabhängigkeit – Deploy läuft ausschließlich über `.github/workflows/deploy-worker.yml`, das `wrangler` selbst per `cloudflare/wrangler-action` verwaltet. Das hält `npm install` plattformunabhängig (siehe unten).

Datenfluss: Upload-Dialog im Dashboard (kein eigener Seitenwechsel, `<dialog>`-Element) → Worker (prüft Passwort serverseitig, validiert CSV) → Commit nach `/data/` → GitHub Actions baut die Seite neu → GitHub Pages. Vollständige Beschreibung: [SPEC.md](SPEC.md).

## Projektspezifischer Kontext (nicht aus dem Code ableitbar)

- Nikolaus hat den einfachen Passwortschutz trotz öffentlicher Erreichbarkeit (GitHub Pages) explizit bestätigt: Die Daten gelten als intern, aber nicht hochvertraulich. Kein stärkerer Zugriffsschutz gewünscht, solange sich das nicht ändert.
- Einziger Datenpfleger ist Nikolaus – kein Multi-User-System, keine Rollen/Accounts vorgesehen. Das ist bewusst so gewollt, nicht eine fehlende Ausbaustufe.
- Der CSV-Parser muss Semikolon-getrennte Dateien mit Komma als Dezimaltrennzeichen (deutscher Excel-Export) automatisch erkennen und normalisieren – Nikolaus exportiert so, nicht im US-Format.
- Der Projektordner selbst liegt unter einem Pfad mit `&` ("Schmidt, Kranz & Co. GmbH"), was Windows-`cmd.exe`-Skript-Shims bricht. Fix liegt in `.npmrc` (`script-shell` auf Git Bash) – nicht entfernen, sonst schlagen `npm test`/`npm run dev`/`npm run build` auf diesem Rechner wieder fehl.

Vollständige Spezifikation: [SPEC.md](SPEC.md)
