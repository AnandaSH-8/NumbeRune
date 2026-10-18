/** Canvas palette (Pixi needs numeric colors; mirrors the CSS tokens in styles.css). */
export const BOARD_COLORS = {
  ivory: 0xfffaf0,
  ivoryEdge: 0xeadfca,
  charcoal: 0x2b2724,
  saffron: 0xf29a1f,
  shadow: 0x3a2a14,
} as const;

/** Muted ink color per card value. Primes wear saffron; 4 and 8 (the special pair) wear tide. */
export const VALUE_COLORS: Record<number, number> = {
  1: 0x8a8073,
  2: 0xe0850f,
  3: 0xe0850f,
  4: 0x2e8686,
  5: 0xe0850f,
  6: 0x5c8a5f,
  7: 0xe0850f,
  8: 0x2e8686,
  9: 0x5a6894,
  10: 0x5a6894,
};

export const CARD_W = 100;
export const CARD_H = 140;
export const DISPLAY_FONT = "Bricolage Grotesque, system-ui, sans-serif";
