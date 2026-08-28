# Tacto Reporting

[![Tests](https://github.com/nikolausridder1301/tacto/actions/workflows/test.yml/badge.svg)](https://github.com/nikolausridder1301/tacto/actions/workflows/test.yml)

Internes Dashboard für KPI-Reporting und Implementierungs-Status des Tacto-Rollouts bei der SK Group. Vollständige Spezifikation: [SPEC.md](SPEC.md). Nicht aus dem Code ableitbare Hintergründe: [CLAUDE.md](CLAUDE.md).

## Struktur (npm Workspaces)

```
packages/
  csv/     – geteilte CSV-Parsing-/Validierungslogik (Issue #1), genutzt von site und worker
  site/    – statisches Dashboard (Vite + TypeScript), Deployment auf GitHub Pages
  worker/  – Cloudflare Worker, nimmt Uploads entgegen und committet ins Repo (Issue #6)
data/      – kpis.csv, status.csv (Datenquelle, wird vom Worker beschrieben)
templates/ – Vorlagen zum Ausfüllen (Issue #8)
```

## Lokal entwickeln

```bash
npm install
npm run dev      # Dashboard lokal starten (packages/site)
npm test         # Alle Tests im Monorepo (aktuell: packages/csv, packages/worker)
npm run build    # Produktions-Build der Site
```

`packages/worker` hat bewusst **kein** `wrangler` als Projektabhängigkeit (siehe unten) – dadurch läuft `npm install` auf jeder Plattform durch, auch auf Windows-ARM64, wo Cloudflares `workerd`-Laufzeit kein natives Binary anbietet.

## Deployment

### Dashboard (GitHub Pages)

Automatisch über `.github/workflows/deploy.yml` bei jedem Push auf `main` → GitHub Pages. Braucht ein Repo-Secret und optional eine Repo-Variable (Settings → Secrets and variables → Actions):

- **Secret** `SITE_PASSWORD_HASH` – SHA-256-Hash des gemeinsamen Seiten-Passworts (siehe [ANLEITUNG.md](ANLEITUNG.md#passwort-ändern) zum Setzen/Ändern).
- **Variable** `WORKER_URL` – die deployte Worker-URL (siehe unten). Ohne diese Variable läuft das Dashboard normal, die Upload-Seite zeigt aber "Kein Upload-Endpunkt konfiguriert".

### Worker (Cloudflare)

Automatisch über `.github/workflows/deploy-worker.yml`. `wrangler` wird dabei ausschließlich von der `cloudflare/wrangler-action` innerhalb des CI-Laufs verwaltet, nicht über `packages/worker/package.json` – deshalb ist lokal kein `wrangler`-Setup nötig. Einmalige Einrichtung, sobald ein Cloudflare-Account vorhanden ist:

1. Repo-Secret `CLOUDFLARE_API_TOKEN` setzen (Cloudflare-Dashboard → API-Token mit "Edit Cloudflare Workers"-Rechten erzeugen).
2. Workflow "Deploy Worker" einmal laufen lassen (Push auf `packages/worker/**` oder manuell über den Actions-Tab → "Run workflow").
3. Worker-Secrets setzen (von einem Rechner mit `npx`-Zugriff, z.B. Mac/Linux/WSL – nicht auf Windows-ARM64 nötig, da dies serverseitig läuft):
   ```bash
   cd packages/worker
   npx wrangler@4 secret put GITHUB_TOKEN        # fein-scoped PAT, nur contents:write auf dieses Repo
   npx wrangler@4 secret put SITE_PASSWORD_HASH  # derselbe Hash wie oben im GitHub-Secret
   ```
4. Die resultierende Worker-URL (z.B. `https://tacto-upload.<subdomain>.workers.dev`) als Repo-Variable `WORKER_URL` hinterlegen und `packages/site/.env` lokal bzw. den Deploy-Workflow einmal neu laufen lassen.

## Umsetzungsstand

Kernfunktionen (Dashboard, KPI-Anzeige, Status-Board, Passwortschutz, Upload-Logik) sind implementiert und getestet. Offen bleibt ausschließlich die einmalige Cloudflare-Einrichtung oben – ohne sie läuft das Dashboard normal, nur der Upload ist bis dahin inaktiv. Fortschritt: [GitHub Issues](https://github.com/nikolausridder1301/tacto/issues).
