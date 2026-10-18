<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- `src/engine/` is the authoritative pure-TypeScript PrimeGame engine (no React/Pixi/UI imports) so it stays deterministic and testable; tests live next to it.
- Open rule questions are isolated in `src/engine/config.ts` (and documented helpers like `resolveExhaustedTie`) so they can be finalized in one place.
- UI and computer players read game state only through `getPlayerView` so hidden selections and opponents' hands never leak.
- `src/store/match.ts` (Zustand) is the only bridge between engine and UI; it owns CPU scheduling, thinking delays and sound triggers. Timers never decide game correctness — every move goes through the engine.
- `src/render/` is PixiJS + GSAP only: `MatchRenderer` renders a `MatchBoardView` derived from `getPlayerView` and emits intents via handlers, never mutating game state. GSAP owns card motion; Framer Motion owns DOM overlays — never both on the same element.
- PixiJS is loaded via dynamic import inside `MatchBoard`'s effect because it touches browser APIs and must not run during SSR.
- Settings persist to localStorage with `skipHydration` and are rehydrated in the root component to avoid hydration mismatches.
- Sounds are synthesized at runtime into WAV data URIs played by Howler, so no audio assets are needed.
