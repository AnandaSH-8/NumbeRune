import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Play, Settings } from "lucide-react";
import { useState } from "react";
import { RuneIcon } from "@/components/game/RuneIcon";
import { UsernameForm } from "@/components/layout/UsernameForm";
import { Button } from "@/components/ui/button";
import { RUNES } from "@/game/types";
import { useSettings } from "@/store/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Numberune — Match runes, empty your hand" },
      { name: "description", content: "A calm, quick browser card game. Match runes or numbers and beat the computer." },
      { property: "og:title", content: "Numberune — Match runes, empty your hand" },
      { property: "og:description", content: "A calm, quick browser card game against the computer." },
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
          {RUNES.map((r) => (
            <span key={r} className="grid h-9 w-9 place-items-center rounded-xl bg-card shadow-soft">
              <RuneIcon rune={r} />
            </span>
          ))}
        </div>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          Match the rune.
          <br />
          <span className="text-primary">Or match the number.</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Numberune is a quick, friendly card game. Be the first to empty your hand against the computer.
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
            <h2 className="text-2xl font-bold">{username ? "Change your name" : "Welcome, traveller"}</h2>
            <p className="mb-6 mt-1 text-muted-foreground">What should we call you at the table?</p>
            <UsernameForm submitLabel={username ? "Save" : "Continue"} onDone={() => setEditing(false)} />
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ready when you are</p>
            <h2 className="mt-1 text-3xl font-bold">
              Hi, {username}{" "}
              <button onClick={() => setEditing(true)} className="align-middle text-sm font-normal text-muted-foreground underline-offset-4 hover:underline">
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
            <p className="mt-5 text-sm text-muted-foreground">Single player against the computer.</p>
          </>
        )}
      </motion.section>
    </main>
  );
}
