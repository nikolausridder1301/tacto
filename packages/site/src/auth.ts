// Gemeinsamer Passwortschutz für Dashboard und Upload-Seite (Issue #5).
// Das Passwort selbst steht nie im Quellcode, nur sein SHA-256-Hash
// (VITE_SITE_PASSWORD_HASH, zur Build-Zeit injiziert). Kein echtes
// Login-System, sondern eine niedrige Hürde, siehe SPEC.md Abschnitt 6/9.

const STORAGE_KEY = "tacto-auth-hash";
const PASSWORD_STORAGE_KEY = "tacto-auth-password";

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface GateElements {
  gate: HTMLElement;
  app: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  error: HTMLElement;
}

export function initPasswordGate(el: GateElements): void {
  const expectedHash = import.meta.env.VITE_SITE_PASSWORD_HASH as string | undefined;

  const unlock = () => {
    el.gate.hidden = true;
    el.app.hidden = false;
  };

  if (!expectedHash) {
    // Kein Passwort konfiguriert (z.B. lokale Entwicklung ohne .env) – Zugriff offen,
    // aber deutlich sichtbar markiert.
    console.warn("VITE_SITE_PASSWORD_HASH ist nicht gesetzt – Passwortschutz ist deaktiviert.");
    unlock();
    return;
  }

  if (sessionStorage.getItem(STORAGE_KEY) === expectedHash) {
    unlock();
    return;
  }

  el.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const hash = await sha256Hex(el.input.value);
    if (hash === expectedHash) {
      sessionStorage.setItem(STORAGE_KEY, expectedHash);
      // Klartext nur im sessionStorage dieses Tabs, damit die Upload-Seite den
      // Worker-Request serverseitig authentifizieren kann (kein echtes Login,
      // siehe SPEC.md Abschnitt 6 – bewusst niedrige Hürde).
      sessionStorage.setItem(PASSWORD_STORAGE_KEY, el.input.value);
      el.error.hidden = true;
      unlock();
    } else {
      el.error.hidden = false;
      el.input.select();
    }
  });
}
