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
- `src/game/` holds pure, framework-free rules and AI (no React/Pixi imports) so it stays testable; tests live next to it.
- `src/store/` (Zustand) is the only bridge between rules and UI; it owns turn timing, CPU scheduling and sound triggers.
- `src/render/` is PixiJS + GSAP only: it renders a GameState and emits intents via handlers, never mutating game state.
- PixiJS is loaded via dynamic import inside `PixiBoard`'s effect because it touches browser APIs and must not run during SSR.
- Settings persist to localStorage with `skipHydration` and are rehydrated in the root component to avoid hydration mismatches.
- Sounds are synthesized at runtime into WAV data URIs played by Howler, so no audio assets are needed.
