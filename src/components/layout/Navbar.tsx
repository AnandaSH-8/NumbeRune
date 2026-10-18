import { Link } from "@tanstack/react-router";
import { useSettings } from "@/store/settings";

export function Navbar() {
  const username = useSettings((s) => s.username);
  const hydrated = useSettings((s) => s.hydrated);
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary font-display text-sm font-extrabold text-primary-foreground shadow-soft">
            N
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">Numberune</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link to="/how-to-play" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            How to play
          </Link>
          <Link to="/settings" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" activeProps={{ className: "text-foreground" }}>
            Settings
          </Link>
          {hydrated && username && (
            <span className="ml-2 hidden rounded-full bg-accent px-3 py-1 font-semibold text-accent-foreground sm:inline">
              {username}
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}
