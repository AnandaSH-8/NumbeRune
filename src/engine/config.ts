/**
 * Rule decisions that the PrimeGame v2 specification does not settle.
 * Every open question lives here so it can be finalized in one place.
 */

export class UnresolvedRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnresolvedRuleError";
  }
}

export interface RuleConfig {
  /**
   * UNRESOLVED IN SPEC (page 5, "One edge case to confirm before coding").
   * Card modification when a battle is won only because the special 4-to-8 rule
   * removed the card(s) that would otherwise have won or tied.
   *
   * - "unresolved": the engine throws UnresolvedRuleError when this case happens.
   * - "minus":      treat it like a prime/divisibility win (−1).
   * - "plus":       treat it like a highest-card win (+1).
   * - "none":       no card modification for this battle.
   */
  readonly fourEightWinPower: "unresolved" | "minus" | "plus" | "none";
}

export const DEFAULT_RULES: RuleConfig = {
  fourEightWinPower: "unresolved",
};

/** The only place the 4-to-8 classification is decided. */
export function resolveFourEightWinPower(config: RuleConfig): "minus" | "plus" | "none" {
  if (config.fourEightWinPower === "unresolved") {
    throw new UnresolvedRuleError(
      "A battle was decided by the special 4-to-8 rule, but the rules do not say whether that is a −1 or +1 win. " +
        "Set RuleConfig.fourEightWinPower to finalize it.",
    );
  }
  return config.fourEightWinPower;
}
