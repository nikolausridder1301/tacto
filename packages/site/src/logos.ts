import type { Gesellschaft } from "@tacto/csv";
import allmineralLogo from "./assets/logos/allmineral.png";
import festLogo from "./assets/logos/fest.jpg";
import hazemagLogo from "./assets/logos/hazemag.jpg";
import maximatorHydrogenLogo from "./assets/logos/maximator-hydrogen.jpg";
import maximatorLogo from "./assets/logos/maximator.png";
import skLogo from "./assets/logos/sk.jpg";

export const SK_LOGO = skLogo;

/** HAZEMAG und Hazemag Systems teilen sich dasselbe Logo. */
const GESELLSCHAFT_LOGOS: Record<Gesellschaft, string> = {
  HAZEMAG: hazemagLogo,
  Allmineral: allmineralLogo,
  "Hazemag Systems": hazemagLogo,
  Maximator: maximatorLogo,
  "Maximator Hydrogen": maximatorHydrogenLogo,
  FEST: festLogo,
};

export function gesellschaftLogo(gesellschaft: Gesellschaft): string {
  return GESELLSCHAFT_LOGOS[gesellschaft];
}
