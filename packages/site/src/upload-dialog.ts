// Upload als schwebendes Dialogfenster auf dem Dashboard selbst (statt einer
// eigenen Seite) – dasselbe Passwort-Gate der Hauptseite hat beim Entsperren
// bereits das Klartext-Passwort in sessionStorage abgelegt (siehe auth.ts),
// das hier für die Worker-Authentifizierung wiederverwendet wird.
//
// Geöffnet wird dieser Dialog aktuell nirgends mehr direkt aus der UI – der
// "Admin"-Link öffnet vorerst nur das Passwort-Pop-up aus admin-gate.ts.
// Das eigentliche Verdrahten (richtiges Passwort → showModal() hier) folgt
// in einem späteren Schritt.

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB, siehe SPEC.md Abschnitt 7

function validateFile(file: File | undefined): string | null {
  if (!file) return null;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return `"${file.name}" ist keine .csv-Datei.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `"${file.name}" ist größer als 2 MB.`;
  }
  return null;
}

export function initUploadDialog(): void {
  const dialog = document.getElementById("upload-dialog") as HTMLDialogElement;
  const closeButton = document.getElementById("upload-dialog-close") as HTMLButtonElement;
  const form = document.getElementById("upload-form") as HTMLFormElement;
  const kpisFile = document.getElementById("kpis-file") as HTMLInputElement;
  const statusFile = document.getElementById("status-file") as HTMLInputElement;
  const submitButton = form.querySelector("button[type=submit]") as HTMLButtonElement;
  const message = document.getElementById("upload-message")!;

  function showMessage(text: string): void {
    message.hidden = false;
    message.textContent = text;
  }

  closeButton.addEventListener("click", () => dialog.close());

  // Klick auf den Backdrop (außerhalb der Dialog-Box) schließt ebenfalls.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.hidden = true;

    const kpis = kpisFile.files?.[0];
    const status = statusFile.files?.[0];

    if (!kpis && !status) {
      showMessage("Bitte mindestens eine Datei auswählen.");
      return;
    }

    const validationError = validateFile(kpis) ?? validateFile(status);
    if (validationError) {
      showMessage(validationError);
      return;
    }

    const workerUrl = import.meta.env.VITE_WORKER_URL as string | undefined;
    if (!workerUrl) {
      showMessage("Kein Upload-Endpunkt konfiguriert (VITE_WORKER_URL fehlt).");
      return;
    }

    submitButton.disabled = true;
    showMessage("Wird hochgeladen …");

    try {
      const password = sessionStorage.getItem("tacto-auth-password") ?? "";
      const payload = {
        password,
        kpisCsv: kpis ? await kpis.text() : undefined,
        statusCsv: status ? await status.text() : undefined,
      };

      const response = await fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { committed?: string[]; error?: string; details?: string[] };

      if (!response.ok) {
        const details = data.details ? `\n– ${data.details.join("\n– ")}` : "";
        showMessage(`${data.error ?? "Upload fehlgeschlagen."}${details}`);
        return;
      }

      showMessage(`Erfolgreich hochgeladen: ${data.committed?.join(", ")}. Änderungen sind in ca. 1–2 Minuten live.`);
      form.reset();
    } catch (err) {
      showMessage(`Netzwerkfehler beim Upload: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      submitButton.disabled = false;
    }
  });
}
