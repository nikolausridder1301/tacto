// Kleiner Aktions-Button mit Popup-Menü (Kebab-Icon), optisch als
// unaufdringlicher Sekundär-Button gehalten (siehe pill-select.ts für den
// wichtigeren, auffälligen Gesellschafts-Filter).

const KEBAB_ICON =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' +
  '<circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>' +
  "</svg>";

export interface MenuAction {
  label: string;
  onSelect: () => void;
}

/** `accessibleLabel` wird nicht angezeigt (der Button zeigt nur das Icon), sondern als aria-label gesetzt. */
export function createMenuButton(container: HTMLElement, accessibleLabel: string, actions: MenuAction[]): void {
  container.innerHTML = "";
  container.classList.add("menu-button");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "menu-button-trigger";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", accessibleLabel);
  trigger.innerHTML = KEBAB_ICON;

  const menu = document.createElement("div");
  menu.className = "menu-button-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  function isOpen(): boolean {
    return !menu.hidden;
  }

  function open(): void {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
  }

  function close(): void {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  for (const action of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu-button-item";
    btn.setAttribute("role", "menuitem");
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      close();
      action.onSelect();
    });
    menu.appendChild(btn);
  }

  trigger.addEventListener("click", () => {
    if (isOpen()) close();
    else open();
  });

  document.addEventListener("click", (event) => {
    if (isOpen() && !container.contains(event.target as Node)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) close();
  });

  container.appendChild(trigger);
  container.appendChild(menu);
}
