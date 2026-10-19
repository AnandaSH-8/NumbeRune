import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { History, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MatchBoard } from "@/components/game/MatchBoard";
import { Button } from "@/components/ui/button";
import { applyPower, awaitingPlayers, getPlayerView } from "@/engine/index";
import { isPlayable } from "@/engine/match";
import type { BattleRecord, Card, RoundRecord } from "@/engine/types";
import type { ArenaCard, MatchBoardView } from "@/render/MatchRenderer";
import { CPU, useMatch, YOU } from "@/store/match";
import { useSettings } from "@/store/settings";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play — Numberune" },
      { name: "description", content: "Play a match of Numberune against the computer." },
      { property: "og:title", content: "Play Numberune" },
      { property: "og:description", content: "Play a match of Numberune against the computer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlayPage,
});

function powerLabel(power: "plus" | "minus" | "none") {
  return power === "plus" ? "+1" : power === "minus" ? "−1" : "no change";
}

function describeRound(r: RoundRecord, name: (id: string) => string): string {
  const res = r.resolution;
  const parts: string[] = [];
  if (res.eliminations.length > 0) {
    const grouped = new Map<string, number[]>();
    for (const e of res.eliminations) {
      const key = e.eliminatorValues.join(" & ");
      grouped.set(key, [...(grouped.get(key) ?? []), e.card.value]);
    }
    const how = res.primePlayed ? "prime power" : "the 4-to-8 rule";
    parts.push(
      [...grouped.entries()]
        .map(([by, vals]) => `${by} removed ${vals.sort((a, b) => a - b).join(", ")}`)
        .join("; ") + ` by ${how}`,
    );
  }
  if (res.winnerId) {
    parts.push(`${name(res.winnerId)} wins with ${res.highestValue}`);
  } else {
    parts.push(`${res.leaders.map(name).join(" and ")} tie at ${res.highestValue} — another round`);
  }
  return parts.join(". ");
}

function describeBattle(b: BattleRecord, name: (id: string) => string): string[] {
  const lines = b.rounds.map((r, i) =>
    b.rounds.length > 1 ? `Round ${i + 1}: ${describeRound(r, name)}` : describeRound(r, name),
  );
  if (b.end.kind === "won") {
    lines.push(
      `${name(b.end.winnerId)} captures ${b.captured.length} cards (${powerLabel(b.end.power)}).`,
    );
  } else {
    lines.push("No winner — the played cards leave the game.");
  }
  if (b.modification) {
    const m = b.modification;
    lines.push(
      m.outcome === "changed"
        ? `Card changed from ${m.from} to ${m.to}.`
        : m.outcome === "kept"
          ? `The ${m.from} was kept as is.`
          : `The ${m.from} was discarded.`,
    );
  }
  return lines;
}

function PlayPage() {
  const navigate = useNavigate();
  const hydrated = useSettings((s) => s.hydrated);
  const username = useSettings((s) => s.username);
  const reducedMotion = useSettings((s) => s.reducedMotion);
  const { state, selectedId, notice, newMatch, select, confirm, modify, stop } = useMatch();
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!username) {
      void navigate({ to: "/" });
      return;
    }
    if (!useMatch.getState().state) newMatch();
  }, [hydrated, username, navigate, newMatch]);

  useEffect(() => () => stop(), [stop]);

  // Keyboard play: ←/→ move through the hand, Enter confirms the highlighted card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useMatch.getState().state;
      if (!st || st.phase !== "selecting" || !awaitingPlayers(st).includes(YOU)) return;
      const full = getPlayerView(st, YOU).hand;
      const hand = full.filter((c) => isPlayable(full, c.id));
      if (hand.length === 0) return;
      const { selectedId } = useMatch.getState();
      const idx = hand.findIndex((c) => c.id === selectedId);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next =
          hand[(idx + (e.key === "ArrowRight" ? 1 : hand.length - 1) + hand.length) % hand.length]!;
        useMatch.getState().select(next.id);
      } else if ((e.key === "Enter" || e.key === " ") && selectedId) {
        e.preventDefault();
        useMatch.getState().confirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const view = useMemo(() => (state ? getPlayerView(state, YOU) : null), [state]);

  const board = useMemo<MatchBoardView | null>(() => {
    if (!state || !view) return null;
    const arena: ArenaCard[] = [];
    if (view.battle) {
      const last = view.battle.reveals.at(-1);
      if (last) {
        for (const [pid, card] of Object.entries(last.cards)) {
          arena.push({ card, owner: pid === YOU ? "you" : "cpu", faceUp: true });
        }
      }
      for (const pid of view.battle.lockedIn) {
        if (pid === YOU && view.battle.mySelectionId) {
          const card = view.hand.find((c) => c.id === view.battle!.mySelectionId);
          if (card) arena.push({ card, owner: "you", faceUp: true });
        } else if (pid === CPU) {
          arena.push({ card: { id: "cpu-hidden", value: 1 }, owner: "cpu", faceUp: false });
        }
      }
    }
    const myTurn = state.phase === "selecting" && awaitingPlayers(state).includes(YOU);
    return {
      hand: view.hand,
      selectableIds: new Set(
        myTurn ? view.hand.filter((c) => isPlayable(view.hand, c.id)).map((c) => c.id) : [],
      ),
      selectedId,
      opponentCount: view.players.find((p) => p.id === CPU)?.cardCount ?? 0,
      arena,
      interactive: myTurn,
      reducedMotion,
    };
  }, [state, view, selectedId, reducedMotion]);

  if (!state || !view || !board) return <main className="flex-1" />;

  const name = (id: string) => (id === YOU ? username : "Computer");
  const myTurn = state.phase === "selecting" && awaitingPlayers(state).includes(YOU);
  const bonusStep = (view.battle?.step ?? 0) > 0;
  const pending = state.phase === "modifying" ? state.pendingModification : null;
  const myModification = pending?.winnerId === YOU;

  const status = notice
    ? notice
    : state.phase === "matchOver"
      ? state.winnerId === YOU
        ? `${username} wins the match!`
        : "Computer wins the match"
      : myModification
        ? `Battle won — pick a captured card to modify (${powerLabel(pending!.power)})`
        : pending
          ? "Computer is modifying a card…"
          : myTurn
            ? bonusStep
              ? "Your 1 earns a bonus play — pick another card"
              : "Your turn — pick a card and confirm"
            : view.battle?.mySelectionId
              ? "Locked in — waiting for the computer…"
              : "Computer is choosing…";

  const historyBattles: BattleRecord[] = [
    ...state.history,
    ...(state.resolvedBattle ? [{ ...state.resolvedBattle, modification: null }] : []),
  ];

  // Brief result chip: the decisive round of the latest battle, naming the rule that won it.
  const lastBattle = historyBattles.at(-1);
  const lastRound = lastBattle?.rounds.at(-1);
  const resultChip =
    lastBattle && lastRound
      ? lastBattle.end.kind === "won"
        ? `${name(lastBattle.end.winnerId)} wins battle ${lastBattle.number} — ${
            lastRound.resolution.primePlayed && lastRound.resolution.eliminations.length > 0
              ? "prime power"
              : lastRound.resolution.fourEightApplied
                ? "the 4-to-8 rule"
                : "highest card"
          } (${powerLabel(lastBattle.end.power)})`
        : `Battle ${lastBattle.number} ended with no winner`
      : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pb-3 pt-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-card px-3 py-1 font-semibold shadow-soft">
            Battle{" "}
            <span className="text-primary">{state.battle?.number ?? state.history.length + 1}</span>
          </span>
          <span className="rounded-full bg-card px-3 py-1 text-muted-foreground shadow-soft">
            Computer · <span className="font-semibold text-foreground">{board.opponentCount}</span>{" "}
            cards
          </span>
          <span className="hidden rounded-full bg-card px-3 py-1 text-muted-foreground shadow-soft sm:inline">
            You · <span className="font-semibold text-foreground">{view.hand.length}</span> cards
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((v) => !v)}
            aria-pressed={showHistory}
          >
            <History /> History
          </Button>
          <Button variant="ghost" size="sm" onClick={newMatch}>
            <RotateCcw /> Restart
          </Button>
        </div>
      </div>

      <div className="relative min-h-[460px] flex-1 overflow-hidden rounded-3xl border border-felt-edge bg-felt shadow-soft">
        <MatchBoard view={board} onSelect={select} className="absolute inset-0" />

        <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center">
          <AnimatePresence mode="wait">
            {resultChip && (
              <motion.p
                key={resultChip}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-full bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground"
              >
                {resultChip}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold shadow-soft ${
                notice
                  ? "bg-destructive text-destructive-foreground"
                  : myTurn || myModification
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground"
              }`}
            >
              {status}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {myTurn && selectedId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2"
            >
              <Button size="lg" className="font-bold shadow-soft" onClick={confirm}>
                Play {view.hand.find((c) => c.id === selectedId)?.value}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showHistory && (
            <motion.aside
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className="absolute inset-y-3 right-3 w-[min(86%,20rem)] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <h3 className="font-display text-lg font-bold">Battle history</h3>
              {historyBattles.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No battles yet. Play a card to start the first one.
                </p>
              ) : (
                <ol className="mt-3 grid gap-3">
                  {[...historyBattles].reverse().map((b) => (
                    <li key={b.number} className="rounded-xl bg-background p-3 text-sm">
                      <p className="font-semibold">
                        Battle {b.number}
                        {b.end.kind === "won" && (
                          <span className="text-primary"> · {name(b.end.winnerId)}</span>
                        )}
                      </p>
                      <ul className="mt-1 grid gap-0.5 text-muted-foreground">
                        {describeBattle(b, name).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {myModification && pending && state.resolvedBattle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-background/60 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.94, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                className="w-[min(94%,30rem)] rounded-3xl border border-border bg-card p-6 shadow-soft"
              >
                <h2 className="text-2xl font-extrabold">You won the battle</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose one captured card to modify by {powerLabel(pending.power)}.
                </p>
                <div className="mt-4 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                  {state.resolvedBattle.captured.map((c) => (
                    <ModificationCard key={c.id} card={c} power={pending.power} onModify={modify} />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.phase === "matchOver" && (
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
                <h2 className="text-3xl font-extrabold">
                  {state.winnerId === YOU
                    ? "You won the match!"
                    : state.winnerId
                      ? "Computer wins"
                      : "A perfect stalemate"}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {state.winnerId === YOU
                    ? "The computer has no cards left."
                    : state.winnerId
                      ? "The computer outlasted you this time."
                      : "Nobody had a card left to break the tie."}
                </p>
                <div className="mt-6 grid gap-2">
                  <Button size="lg" className="font-bold" onClick={newMatch}>
                    Play again
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/">Back to menu</Link>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function ModificationCard({
  card,
  power,
  onModify,
}: {
  card: Card;
  power: "plus" | "minus";
  onModify: (id: string, b?: "keep" | "discard") => void;
}) {
  const result = applyPower(card.value, power);
  return (
    <div className="rounded-xl border border-border bg-background p-3 text-center">
      <p className="text-2xl font-extrabold">{card.value}</p>
      {result.kind === "value" ? (
        <>
          <p className="text-xs text-muted-foreground">becomes {result.value}</p>
          <Button size="sm" className="mt-2 w-full" onClick={() => onModify(card.id)}>
            Modify
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">at its limit</p>
          <div className="mt-2 grid grid-cols-2 gap-1">
            <Button size="sm" variant="secondary" onClick={() => onModify(card.id, "keep")}>
              Keep
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onModify(card.id, "discard")}>
              Discard
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
