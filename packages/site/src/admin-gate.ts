// Platzhalter für den Admin-Zugang: Der "Admin"-Link unten auf dem Dashboard
// öffnet aktuell nur dieses Passwort-Pop-up. Die eigentliche Prüfung
// (richtiges Passwort → Upload-Dialog aus upload-dialog.ts öffnen) folgt in
// einem späteren Schritt – hier geht es erstmal nur um Text + Pop-up-Gerüst
// (öffnen, schließen per ✕/Backdrop/Escape).

export function initAdminGate(): void {
  const trigger = document.getElementById("admin-trigger") as HTMLButtonElement;
  const dialog = document.getElementById("admin-password-dialog") as HTMLDialogElement;
  const closeButton = document.getElementById("admin-password-dialog-close") as HTMLButtonElement;
  const form = document.getElementById("admin-password-form") as HTMLFormElement;

  trigger.addEventListener("click", () => {
    form.reset();
    dialog.showModal();
  });

  closeButton.addEventListener("click", () => dialog.close());

  // Klick auf den Backdrop (außerhalb der Dialog-Box) schließt ebenfalls.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    // TODO: Passwort prüfen und bei Erfolg dialog.close() + Upload-Dialog
    // öffnen (siehe upload-dialog.ts). Noch nicht implementiert.
  });
}
