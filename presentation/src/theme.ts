import { loadFont as loadDisplay } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadBody } from "@remotion/google-fonts/Quicksand";

export const display = loadDisplay().fontFamily;
export const body = loadBody().fontFamily;

// Paleta de marca (igual que la app: boutique de caramelo).
export const C = {
  bg: "#fff4fa",
  surface: "#fffafd",
  ink: "#3d1430",
  muted: "#8a6a80",
  pink: "#ff4d97",
  pinkDark: "#d8276f",
  pinkSoft: "#ffd9ea",
  lilac: "#b57bf0",
  grape: "#7c3aed",
  gold: "#ffc233",
  white: "#ffffff",
} as const;
