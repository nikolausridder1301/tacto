import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

const TEST_PASSWORD = "test-pw";

const baseEnv: Env = {
  GITHUB_TOKEN: "gh-token",
  SITE_PASSWORD_HASH: sha256(TEST_PASSWORD),
  GITHUB_OWNER: "nikolausridder1301",
  GITHUB_REPO: "tacto",
  GITHUB_BRANCH: "main",
};

const VALID_KPI_CSV =
  "Monat,Gesellschaft,KPI_Bestellvolumen_EUR,KPI_Einsparungen_EUR,KPI_Verhandlungen,KPI_Verhandlungsquote_Prozent,KPI_Datenqualitaet_Prozent,KPI_Liefertreue_Prozent,KPI_Mengentreue_Prozent\n2027-01,Maximator Hydrogen,1320000,38000,2,9.8,82,78,96";

const INVALID_KPI_CSV = "Monat,Gesellschaft\n2026-09,Maximator";

function request(body: unknown, init?: RequestInit): Request {
  return new Request("https://worker.example/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:5173" },
    body: JSON.stringify(body),
    ...init,
  });
}

describe("Upload-Worker", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (!init || init.method === undefined) {
        // GET (sha-Lookup): so tun, als gäbe es die Datei noch nicht.
        return new Response("Not Found", { status: 404 });
      }
      // PUT (Commit)
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lehnt falsches Passwort mit 401 ab, ohne GitHub zu kontaktieren", async () => {
    const response = await worker.fetch(request({ password: "falsch", kpisCsv: VALID_KPI_CSV }), baseEnv);
    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lehnt fehlende Dateien mit 400 ab", async () => {
    const response = await worker.fetch(request({ password: TEST_PASSWORD }), baseEnv);
    expect(response.status).toBe(400);
  });

  it("lehnt ungültige CSV-Inhalte ab und committet nichts", async () => {
    const response = await worker.fetch(request({ password: TEST_PASSWORD, kpisCsv: INVALID_KPI_CSV }), baseEnv);
    expect(response.status).toBe(400);
    const data = (await response.json()) as { details: string[] };
    expect(data.details.some((d) => d.includes("kpis.csv"))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("committet gültige KPI-Daten via GitHub Contents API", async () => {
    const response = await worker.fetch(request({ password: TEST_PASSWORD, kpisCsv: VALID_KPI_CSV }), baseEnv);
    expect(response.status).toBe(200);
    const data = (await response.json()) as { committed: string[] };
    expect(data.committed).toEqual(["kpis.csv"]);

    const putCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(putCall).toBeDefined();
    const [url, init] = putCall!;
    expect(url).toContain("/repos/nikolausridder1301/tacto/contents/data/kpis.csv");
    expect(init.headers.Authorization).toBe("Bearer gh-token");
    const body = JSON.parse(init.body as string);
    expect(atob(body.content)).toBe(VALID_KPI_CSV);
  });

  it("beantwortet OPTIONS-Preflight mit CORS-Headern", async () => {
    const response = await worker.fetch(new Request("https://worker.example/upload", { method: "OPTIONS" }), baseEnv);
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("lehnt andere HTTP-Methoden ab", async () => {
    const response = await worker.fetch(new Request("https://worker.example/upload", { method: "GET" }), baseEnv);
    expect(response.status).toBe(405);
  });
});
