// Platzhalter für den Admin-Zugang: Der "Admin"-Link unten auf dem Dashboard
// öffnet aktuell nur dieses Passwort-Pop-up. Die eigentliche Prüfung
// (richtiges Passwort → Upload-Dialog aus upload-dialog.ts öffnen) folgt in
// einem späteren Schritt. Bis dahin lehnt "Entsperren" jede Eingabe ab
// (immer "Falsches Passwort."), damit das Pop-up sich schon wie der spätere
// echte Gate verhält statt einfach nichts zu tun.

export function initAdminGate(): void {
  const trigger = document.getElementById("admin-trigger") as HTMLButtonElement;
  const dialog = document.getElementById("admin-password-dialog") as HTMLDialogElement;
  const closeButton = document.getElementById("admin-password-dialog-close") as HTMLButtonElement;
  const form = document.getElementById("admin-password-form") as HTMLFormElement;
  const input = document.getElementById("admin-password") as HTMLInputElement;
  const error = document.getElementById("admin-password-error")!;

  trigger.addEventListener("click", () => {
    form.reset();
    error.hidden = true;
    dialog.showModal();
  });

  closeButton.addEventListener("click", () => dialog.close());

  // Klick auf den Backdrop (außerhalb der Dialog-Box) schließt ebenfalls.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    // TODO: Passwort echt prüfen und bei Erfolg error.hidden = true,
    // dialog.close() + Upload-Dialog öffnen (siehe upload-dialog.ts). Bis
    // dahin wird jede Eingabe als falsch behandelt.
    error.hidden = false;
    input.select();
  });
}
