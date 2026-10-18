import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { useEffect, useMemo } from "react";
import { PixiBoard } from "@/components/game/PixiBoard";
import { RuneIcon } from "@/components/game/RuneIcon";
import { Button } from "@/components/ui/button";
import { playableCards, topCard } from "@/game/rules";
import type { GameState } from "@/game/types";
import { RUNE_LABELS } from "@/render/theme";
import type { BoardView } from "@/render/BoardRenderer";
import { useGame } from "@/store/game";
import { useSettings } from "@/store/settings";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Numberune" },
      { name: "description", content: "Play a round of Numberune against the computer." },
      { property: "og:title", content: "Play Numberune" },
      { property: "og:description", content: "Play a round of Numberune against the computer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

function statusText(game: GameState, name: string): string {
  if (game.winner) return game.winner === "player" ? `${name} wins!` : "Computer wins";
  if (game.current === "cpu") return "Computer is thinking…";
  if (game.drawnCardId) return "You drew a match — play it or pass";
  return playableCards(game, "player").length ? "Your turn — play a matching card" : "No match — tap the draw pile";
}

function PlayPage() {
  const navigate = useNavigate();
  const hydrated = useSettings((s) => s.hydrated);
  const username = useSettings((s) => s.username);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const { game, notice, score, newGame, play, draw, pass, stop } = useGame();

  useEffect(() => {
    if (!hydrated) return;
    if (!username) {
      void navigate({ to: "/" });
      return;
    }
    if (!useGame.getState().game) newGame();
  }, [hydrated, username, navigate, newGame]);

  useEffect(() => () => stop(), [stop]);

  const view = useMemo<BoardView | null>(() => {
    if (!game) return null;
    const mine = game.current === "player" && !game.winner;
    return {
      state: game,
      playableIds: new Set(playableCards(game, "player").map((c) => c.id)),
      interactive: mine,
      canDraw: mine && !game.drawnCardId,
      reducedMotion,
    };
  }, [game, reducedMotion]);

  if (!game || !view) return <main className="flex-1" />;
  const top = topCard(game);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-3 pt-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-card px-3 py-1 font-semibold shadow-soft">
            {username} <span className="text-primary">{score.player}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            CPU <span className="text-primary">{score.cpu}</span>
          </span>
          <span className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
            Top: <RuneIcon rune={top.rune} className="h-4 w-4" /> {RUNE_LABELS[top.rune]} {top.value}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={newGame}>
          <RotateCcw /> New round
        </Button>
      </div>

      <div className="relative min-h-[460px] flex-1 overflow-hidden rounded-3xl border border-felt-edge bg-felt shadow-soft">
        <PixiBoard view={view} onPlay={play} onDraw={draw} className="absolute inset-0" />

        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-[calc(50%+6.5rem)] justify-center sm:-translate-y-[calc(50%+8rem)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusText(game, username) + (notice ?? "")}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-soft ${
                notice ? "bg-destructive text-destructive-foreground" : game.current === "player" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {notice ?? statusText(game, username)}
            </motion.div>
          </AnimatePresence>
        </div>

        {game.drawnCardId && game.current === "player" && !game.winner && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 sm:right-6">
            <Button variant="secondary" onClick={pass} className="shadow-soft">
              Keep & pass
            </Button>
          </div>
        )}

        <AnimatePresence>
          {game.winner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.94, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                className="w-[min(90%,22rem)] rounded-3xl border border-border bg-card p-7 text-center shadow-soft"
              >
                <h2 className="text-3xl font-extrabold">{game.winner === "player" ? "You won!" : "So close"}</h2>
                <p className="mt-2 text-muted-foreground">
                  {game.winner === "player" ? "Every rune found its place." : `The computer emptied its hand. You had ${game.hands.player.length} left.`}
                </p>
                <div className="mt-6 grid gap-2">
                  <Button size="lg" className="font-bold" onClick={newGame}>Play again</Button>
                  <Button asChild variant="ghost"><Link to="/">Back to menu</Link></Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
