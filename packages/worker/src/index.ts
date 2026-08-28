// Nimmt kpis.csv / status.csv von der Upload-Seite entgegen, prüft das
// Passwort serverseitig, validiert den Inhalt über @tacto/csv und committet
// gültige Dateien ins Repo. GITHUB_TOKEN und SITE_PASSWORD_HASH liegen
// ausschließlich als Worker-Secrets, niemals im Code (siehe SPEC.md 6).

import { parseKpiCsv, parseStatusCsv } from "@tacto/csv";

export interface Env {
  GITHUB_TOKEN: string;
  SITE_PASSWORD_HASH: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
}

interface UploadPayload {
  password?: string;
  kpisCsv?: string;
  statusCsv?: string;
}

const ALLOWED_ORIGINS = new Set(["https://nikolausridder1301.github.io", "http://localhost:5173"]);

function corsHeaders(origin: string | null): HeadersInit {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://nikolausridder1301.github.io";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function githubHeaders(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "tacto-upload-worker",
  };
}

async function commitFile(env: Env, path: string, content: string, message: string): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;

  const getResp = await fetch(`${url}?ref=${env.GITHUB_BRANCH}`, { headers: githubHeaders(env) });
  let sha: string | undefined;
  if (getResp.ok) {
    const data = (await getResp.json()) as { sha: string };
    sha = data.sha;
  } else if (getResp.status !== 404) {
    throw new Error(`GitHub-Lesezugriff fehlgeschlagen (${getResp.status}): ${await getResp.text()}`);
  }

  const putResp = await fetch(url, {
    method: "PUT",
    headers: { ...githubHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: base64EncodeUtf8(content),
      sha,
      branch: env.GITHUB_BRANCH,
    }),
  });

  if (!putResp.ok) {
    throw new Error(`GitHub-Commit fehlgeschlagen (${putResp.status}): ${await putResp.text()}`);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return json({ error: "Nur POST erlaubt." }, 405, origin);
    }

    let payload: UploadPayload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Ungültiger Request-Body (erwartet JSON)." }, 400, origin);
    }

    const passwordHash = await sha256Hex(payload.password ?? "");
    if (passwordHash !== env.SITE_PASSWORD_HASH) {
      return json({ error: "Falsches Passwort." }, 401, origin);
    }

    if (!payload.kpisCsv && !payload.statusCsv) {
      return json({ error: "Keine Datei übergeben." }, 400, origin);
    }

    const errors: string[] = [];

    if (payload.kpisCsv) {
      const result = parseKpiCsv(payload.kpisCsv);
      if (result.errors.length > 0) {
        errors.push(...result.errors.map((e) => `kpis.csv – ${e}`));
      }
    }
    if (payload.statusCsv) {
      const result = parseStatusCsv(payload.statusCsv);
      if (result.errors.length > 0) {
        errors.push(...result.errors.map((e) => `status.csv – ${e}`));
      }
    }

    if (errors.length > 0) {
      return json({ error: "Validierung fehlgeschlagen.", details: errors }, 400, origin);
    }

    const committed: string[] = [];
    try {
      if (payload.kpisCsv) {
        await commitFile(env, "data/kpis.csv", payload.kpisCsv, "kpis.csv aktualisiert (Upload-Seite)");
        committed.push("kpis.csv");
      }
      if (payload.statusCsv) {
        await commitFile(env, "data/status.csv", payload.statusCsv, "status.csv aktualisiert (Upload-Seite)");
        committed.push("status.csv");
      }
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "Unbekannter Fehler beim Commit." }, 502, origin);
    }

    return json({ committed }, 200, origin);
  },
};
