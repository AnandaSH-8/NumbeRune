import { createFileRoute, Link } from "@tanstack/react-router";
import { RuneIcon } from "@/components/game/RuneIcon";
import { Button } from "@/components/ui/button";
import { HAND_SIZE, RUNES } from "@/game/types";
import { RUNE_LABELS } from "@/render/theme";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to play Numberune" },
      { name: "description", content: "Learn the rules of Numberune in a minute: match the rune or the number." },
      { property: "og:title", content: "How to play Numberune" },
      { property: "og:description", content: "Learn the rules of Numberune in a minute." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowToPlay,
});

const STEPS = [
  { title: "Get your hand", body: `You and the computer each get ${HAND_SIZE} cards. One card is flipped face up to start the discard pile.` },
  { title: "Match to play", body: "On your turn, play one card that matches the top card's rune or its number. A Moon 4 can go on any Moon, or on any 4." },
  { title: "Can't play? Draw", body: "Tap the draw pile to take one card. If it matches, you can play it right away or keep it and pass. Otherwise your turn ends." },
  { title: "Empty your hand", body: "The first player with no cards left wins the round. When the draw pile runs out, the discard pile is reshuffled." },
];

function HowToPlay() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-4xl font-extrabold">How to play</h1>
      <p className="mt-2 text-muted-foreground">Rounds take about three minutes.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {RUNES.map((r) => (
          <span key={r} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold">
            <RuneIcon rune={r} className="h-4 w-4" /> {RUNE_LABELS[r]}
          </span>
        ))}
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold">Numbers 1–9</span>
      </div>

      <ol className="mt-8 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-display font-bold text-accent-foreground">{i + 1}</span>
            <h2 className="mt-3 text-lg font-bold">{s.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>

      <Button asChild size="lg" className="mt-8 h-12 font-bold">
        <Link to="/play">Start a game</Link>
      </Button>
    </main>
  );
}
