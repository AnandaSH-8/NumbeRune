import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { UsernameForm } from "@/components/layout/UsernameForm";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Difficulty } from "@/game/types";
import { playSound } from "@/lib/sound";
import { useSettings, type CpuSpeed } from "@/store/settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Numberune" },
      { name: "description", content: "Change your name, sound, motion and computer opponent settings." },
      { property: "og:title", content: "Settings — Numberune" },
      { property: "og:description", content: "Tune Numberune to your liking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const s = useSettings();
  if (!s.hydrated) return <main className="flex-1" />;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="text-4xl font-extrabold">Settings</h1>
      <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card px-6 shadow-soft">
        <div className="py-5">
          <UsernameForm key={s.username} submitLabel="Save" />
        </div>
        <Row title="Sound effects" hint="Soft tones when cards are played.">
          <Switch
            checked={s.soundEnabled}
            onCheckedChange={(v) => {
              s.update({ soundEnabled: v });
              if (v) playSound("play");
            }}
            aria-label="Sound effects"
          />
        </Row>
        <Row title="Reduce motion" hint="Cards move instantly instead of gliding.">
          <Switch checked={s.reducedMotion} onCheckedChange={(v) => s.update({ reducedMotion: v })} aria-label="Reduce motion" />
        </Row>
        <Row title="Computer skill" hint="Easy plays randomly; Normal plans ahead.">
          <ToggleGroup type="single" variant="outline" value={s.difficulty} onValueChange={(v) => v && s.update({ difficulty: v as Difficulty })}>
            <ToggleGroupItem value="easy" className="px-4">Easy</ToggleGroupItem>
            <ToggleGroupItem value="normal" className="px-4">Normal</ToggleGroupItem>
          </ToggleGroup>
        </Row>
        <Row title="Computer speed" hint="How long the computer thinks.">
          <ToggleGroup type="single" variant="outline" value={s.cpuSpeed} onValueChange={(v) => v && s.update({ cpuSpeed: v as CpuSpeed })}>
            <ToggleGroupItem value="relaxed" className="px-3">Relaxed</ToggleGroupItem>
            <ToggleGroupItem value="normal" className="px-3">Normal</ToggleGroupItem>
            <ToggleGroupItem value="quick" className="px-3">Quick</ToggleGroupItem>
          </ToggleGroup>
        </Row>
      </div>
    </main>
  );
}
