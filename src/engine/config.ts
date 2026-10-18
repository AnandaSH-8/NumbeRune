/**
 * Rule decisions that the PrimeGame v2 specification leaves open.
 * Every such decision lives here so it can be changed in one place.
 */

export interface RuleConfig {
  /**
   * Card modification when a battle is won only because the special 4-to-8 rule
   * removed the card(s) that would otherwise have won or tied.
   *
   * Decided by the game author (2026-10-18): such a win is a −1 win.
   * Kept configurable in case the decision is revisited.
   *
   * - "minus": treat it like a prime-power win (−1).  ← current decision
   * - "plus":  treat it like a highest-card win (+1).
   * - "none":  no card modification for this battle.
   */
  readonly fourEightWinPower: "minus" | "plus" | "none";
}

export const DEFAULT_RULES: RuleConfig = {
  fourEightWinPower: "minus",
};

/** The only place the 4-to-8 classification is decided. */
export function resolveFourEightWinPower(config: RuleConfig): "minus" | "plus" | "none" {
  return config.fourEightWinPower;
}
