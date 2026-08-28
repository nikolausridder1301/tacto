// Eigener Dropdown statt nativem <select>: Browser rendern das native
// Options-Popup immer mit ihrer eigenen (eckigen) Optik, unabhängig vom
// Styling des <select> selbst – das erzeugt den sichtbaren "Bruch" zwischen
// dem abgerundeten Pill-Button und dem eckigen Popup darunter. Mit einem
// selbst gebauten Listbox-Popup lässt sich die Optik durchgängig gestalten.

export interface PillSelectOption {
  value: string;
  label: string;
}

export interface PillSelect {
  getValue: () => string;
  setValue: (value: string) => void;
}

export function createPillSelect(
  container: HTMLElement,
  options: PillSelectOption[],
  onChange: (value: string) => void,
): PillSelect {
  let value = options[0]?.value ?? "";

  container.innerHTML = "";
  container.classList.add("pill-select");

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "pill-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const labelEl = document.createElement("span");
  labelEl.className = "pill-select-label";
  trigger.appendChild(labelEl);

  const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  chevron.setAttribute("viewBox", "0 0 24 24");
  chevron.setAttribute("class", "pill-select-chevron");
  chevron.setAttribute("aria-hidden", "true");
  chevron.innerHTML =
    '<polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" />';
  trigger.appendChild(chevron);

  const menu = document.createElement("ul");
  menu.className = "pill-select-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  const optionEls = new Map<string, HTMLLIElement>();
  for (const opt of options) {
    const li = document.createElement("li");
    li.className = "pill-select-option";
    li.setAttribute("role", "option");
    li.dataset.value = opt.value;
    li.textContent = opt.label;
    li.tabIndex = -1;
    menu.appendChild(li);
    optionEls.set(opt.value, li);
  }

  container.appendChild(trigger);
  container.appendChild(menu);

  function updateSelection(): void {
    const opt = options.find((o) => o.value === value);
    labelEl.textContent = opt?.label ?? "";
    for (const [v, li] of optionEls) {
      const selected = v === value;
      li.setAttribute("aria-selected", String(selected));
      li.classList.toggle("is-selected", selected);
    }
  }

  function isOpen(): boolean {
    return !menu.hidden;
  }

  function open(): void {
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    optionEls.get(value)?.focus();
  }

  function close(): void {
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  }

  function select(newValue: string): void {
    value = newValue;
    updateSelection();
    close();
    trigger.focus();
    onChange(value);
  }

  trigger.addEventListener("click", () => {
    if (isOpen()) close();
    else open();
  });

  menu.addEventListener("click", (event) => {
    const li = (event.target as HTMLElement).closest<HTMLLIElement>(".pill-select-option");
    if (li?.dataset.value) select(li.dataset.value);
  });

  menu.addEventListener("keydown", (event) => {
    const items = Array.from(optionEls.values());
    const currentIndex = items.findIndex((li) => li === document.activeElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[Math.min(currentIndex + 1, items.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[Math.max(currentIndex - 1, 0)]?.focus();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const li = items[currentIndex];
      if (li?.dataset.value) select(li.dataset.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
      trigger.focus();
    } else if (event.key === "Tab") {
      close();
    }
  });

  document.addEventListener("click", (event) => {
    if (isOpen() && !container.contains(event.target as Node)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen()) close();
  });

  updateSelection();

  return {
    getValue: () => value,
    setValue: (v: string) => {
      value = v;
      updateSelection();
    },
  };
}
