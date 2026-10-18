# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Rule decisions and open questions

The engine follows the PrimeGame Rules Specification v2, with these author decisions (2026-10-18):

- **Example D conflict:** the PDF text says 3 does not divide 9, but the prime table and Example C say it does. The engine follows the divisibility rule: 3 removes 9, 7 wins by highest card (+1).
- **−1 wins:** a battle is a prime-power (−1) win only when the winner is a prime and the sole surviving card after the prime step. Otherwise the highest surviving card decides (+1). Examples A, C, D, E and F are all +1 under this rule.
- **4-to-8 power classification (still isolated):** the PDF never says whether a win caused solely by the special 4-to-8 rule is a −1 or +1 win. The current decision is −1, kept configurable via `RuleConfig.fourEightWinPower` in `src/engine/config.ts` (`"minus" | "plus" | "none"`) so it can be finalized without touching engine logic.
- **Exhausted ties (not covered by spec):** if tied players have no cards for another round — 2+ tied with cards continue; exactly 1 wins by default with no modification; 0 means no winner and the played cards leave the game. See `resolveExhaustedTie` in `src/engine/match.ts`.
