import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseKpiCsv, parseStatusCsv } from "./index";

const templatesDir = fileURLToPath(new URL("../../../templates/", import.meta.url));

describe("Vorlagen in /templates (Issue #8)", () => {
  it("kpis.csv lässt sich unverändert erfolgreich hochladen", () => {
    const csv = readFileSync(`${templatesDir}kpis.csv`, "utf-8");
    const { rows, errors } = parseKpiCsv(csv);
    expect(errors).toEqual([]);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("status.csv lässt sich unverändert erfolgreich hochladen", () => {
    const csv = readFileSync(`${templatesDir}status.csv`, "utf-8");
    const { rows, errors } = parseStatusCsv(csv);
    expect(errors).toEqual([]);
    expect(rows.length).toBeGreaterThan(0);
  });
});
