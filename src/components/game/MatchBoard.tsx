import { useEffect, useRef } from "react";
import type { MatchBoardHandlers, MatchBoardView, MatchRenderer } from "@/render/MatchRenderer";

interface Props extends MatchBoardHandlers {
  view: MatchBoardView;
  className?: string;
}

/** Bridges React to the PixiJS match renderer. Pixi is imported lazily so it never runs during SSR. */
export function MatchBoard({ view, onSelect, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MatchRenderer | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const handlersRef = useRef<MatchBoardHandlers>({ onSelect });
  handlersRef.current = { onSelect };

  useEffect(() => {
    let cancelled = false;
    let renderer: MatchRenderer | null = null;
    void import("@/render/MatchRenderer").then(async ({ MatchRenderer }) => {
      if (cancelled || !hostRef.current) return;
      renderer = new MatchRenderer({
        onSelect: (id) => handlersRef.current.onSelect(id),
      });
      rendererRef.current = renderer;
      renderer.update(viewRef.current);
      await renderer.init(hostRef.current);
    });
    return () => {
      cancelled = true;
      renderer?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(view);
  }, [view]);

  return <div ref={hostRef} className={className} aria-label="Game board" role="application" />;
}
