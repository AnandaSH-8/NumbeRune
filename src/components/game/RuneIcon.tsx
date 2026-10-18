import type { Rune } from "@/game/types";
import { cn } from "@/lib/utils";

const COLOR: Record<Rune, string> = {
  sun: "text-rune-sun",
  moon: "text-rune-moon",
  leaf: "text-rune-leaf",
  tide: "text-rune-tide",
};

export function RuneIcon({ rune, className }: { rune: Rune; className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={cn("h-5 w-5", COLOR[rune], className)} aria-hidden>
      {rune === "sun" && (
        <g fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle r="5" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <line key={i} x1={Math.cos(a) * 7.5} y1={Math.sin(a) * 7.5} x2={Math.cos(a) * 10} y2={Math.sin(a) * 10} />;
          })}
        </g>
      )}
      {rune === "moon" && <path fill="currentColor" d="M3 -8.5 A9 9 0 1 0 8.5 4 A7 7 0 1 1 3 -8.5Z" />}
      {rune === "leaf" && <path fill="currentColor" d="M0 -10 L6.5 0 L0 10 L-6.5 0Z" />}
      {rune === "tide" && (
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {[-5, 0, 5].map((y) => (
            <path key={y} d={`M-10 ${y} C-5 ${y - 4} 0 ${y + 4} 5 ${y - 1} L10 ${y - 2}`} />
          ))}
        </g>
      )}
    </svg>
  );
}
