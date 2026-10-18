import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Play, Settings } from "lucide-react";
import { useState } from "react";
import { UsernameForm } from "@/components/layout/UsernameForm";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/store/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Numberune — Primes strike, highest survives" },
      {
        name: "description",
        content:
          "A calm, quick browser card game. Outplay the computer with primes, bonuses and lucky sevens.",
      },
      { property: "og:title", content: "Numberune — Primes strike, highest survives" },
      {
        property: "og:description",
        content: "A calm, quick browser card game against the computer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const hydrated = useSettings((s) => s.hydrated);
  const username = useSettings((s) => s.username);
  const [editing, setEditing] = useState(false);
  const needsName = !username || editing;

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
      <div>
        <div className="mb-5 flex gap-2">
          {[2, 3, 5, 7].map((n) => (
            <span
              key={n}
              className="grid h-9 w-9 place-items-center rounded-xl bg-card font-display font-bold text-primary shadow-soft"
            >
              {n}
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          Primes strike first.
          <br />
          <span className="text-primary">The highest card survives.</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Numberune is a quick, tactical card duel. Pick cards in secret, bend the numbers with
          primes, and outlast the computer.
        </p>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8"
      >
        {!hydrated ? (
          <div className="h-40" />
        ) : needsName ? (
          <>
            <h2 className="text-2xl font-bold">
              {username ? "Change your name" : "Welcome, traveller"}
            </h2>
            <p className="mb-6 mt-1 text-muted-foreground">What should we call you at the table?</p>
            <UsernameForm
              submitLabel={username ? "Save" : "Continue"}
              onDone={() => setEditing(false)}
            />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Ready when you are
            </p>
            <h2 className="mt-1 text-3xl font-bold">
              Hi, {username}{" "}
              <button
                onClick={() => setEditing(true)}
                className="align-middle text-sm font-normal text-muted-foreground underline-offset-4 hover:underline"
              >
                change
              </button>
            </h2>
            <div className="mt-6 grid gap-3">
              <Button asChild size="lg" className="h-14 text-base font-bold">
                <Link to="/play">
                  <Play /> Play game
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="secondary" size="lg" className="h-12">
                  <Link to="/how-to-play">
                    <BookOpen /> How to play
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="h-12">
                  <Link to="/settings">
                    <Settings /> Settings
                  </Link>
                </Button>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Single player against the computer.
            </p>
          </>
        )}
      </motion.section>
    </main>
  );
}
