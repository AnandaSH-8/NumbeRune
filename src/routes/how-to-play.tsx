import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to play Numberune" },
      { name: "description", content: "Learn the rules of Numberune: primes strike first, the highest surviving card wins the battle." },
      { property: "og:title", content: "How to play Numberune" },
      { property: "og:description", content: "Learn the rules of Numberune in a minute." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowToPlay,
});

const STEPS = [
  {
    title: "Your hand",
    body: "You and the computer each start with your own set of cards numbered 1 to 10. Every card is its own card, even when numbers repeat.",
  },
  {
    title: "Secret picks",
    body: "Each battle, both players secretly choose a card. The choices are revealed together — you never see the computer's pick early.",
  },
  {
    title: "Primes strike first",
    body: "If any prime (2, 3, 5, 7) is played, it removes every non-prime card it divides. A 2 removes 4, 6, 8 and 10; a 3 removes 6 and 9; a 5 removes 10. Primes never remove primes.",
  },
  {
    title: "The 4-to-8 rule",
    body: "Only when no prime is played, a 4 removes every 8. Then the highest surviving card wins the battle.",
  },
  {
    title: "Ties replay",
    body: "If the highest surviving cards tie, only the tied players play another round with a fresh secret pick.",
  },
  {
    title: "The 1 is a bonus",
    body: "Playing a 1 earns you an immediate extra pick. Chain several 1s to stack the battle in your favor.",
  },
  {
    title: "Capture and modify",
    body: "The battle winner captures every card played. A prime-power win changes one captured card by −1; a highest-card win by +1. A card at 1 or 10 can be kept as is or discarded for good.",
  },
  {
    title: "Win the match",
    body: "Losing a battle costs you cards but not your seat. You're only out when your hand is empty — the last player holding cards wins the match.",
  },
];

function HowToPlay() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-4xl font-extrabold">How to play</h1>
      <p className="mt-2 text-muted-foreground">A match takes about five minutes.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {[2, 3, 5, 7].map((p) => (
          <span key={p} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold">
            Prime {p}
          </span>
        ))}
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold">Cards 1–10</span>
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
        <Link to="/play">Start a match</Link>
      </Button>
    </main>
  );
}
