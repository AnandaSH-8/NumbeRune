import type { Rune } from "@/game/types";

/** Canvas palette (Pixi needs numeric colors; mirrors the CSS tokens in styles.css). */
export const BOARD_COLORS = {
  ivory: 0xfffaf0,
  ivoryEdge: 0xeadfca,
  charcoal: 0x2b2724,
  saffron: 0xf29a1f,
  shadow: 0x3a2a14,
} as const;

export const RUNE_COLORS: Record<Rune, number> = {
  sun: 0xe0850f,
  moon: 0x5a6894,
  leaf: 0x5c8a5f,
  tide: 0x2e8686,
};

export const RUNE_LABELS: Record<Rune, string> = {
  sun: "Sun",
  moon: "Moon",
  leaf: "Leaf",
  tide: "Tide",
};

export const CARD_W = 100;
export const CARD_H = 140;
export const DISPLAY_FONT = "Bricolage Grotesque, system-ui, sans-serif";
