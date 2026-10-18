# Roadmap

- [ ] Gameplay UI on the real engine (board, arena, hand, history, modification, match end) — in progress
- [ ] Remove legacy placeholder ruleset (src/game) once UI is on the engine
- [ ] Computer opponent: strategy module, legal moves only, hidden selections, difficulty, thinking delays (engine/ai.ts exists; extend + tests vs engine)
- [ ] Polish: GSAP card animations (deal, flip, elimination, 4-to-8 effect, tie, winner, capture, ±1), sounds + volume control, reduced motion, performance
- [ ] Full review: verify all PDF examples, edge cases, username persistence, restart cleanliness, responsiveness, keyboard, sound controls; add integration tests; check deps/types/lint/build; document remaining rule ambiguity
