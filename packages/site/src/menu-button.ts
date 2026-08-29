// Kleiner Aktions-Button mit Popup-Menü (z.B. "Export ▾"), optisch als
// unaufdringlicher Sekundär-Button gehalten (siehe pill-select.ts für den
// wichtigeren, auffälligen Gesellschafts-Filter).

export interface MenuAction {
  label: string;
  onSelect: () => void;
}

export function createMenuButton(container: HTMLElement, triggerLabel: string, actions: MenuAction[]): void {
  container.innerHTML = "";
  container.classList.add("menu-button");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "menu-button-trigger";
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.textContent = triggerLabel;

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
