import { useEffect, useRef } from "react";
import type { BoardHandlers, BoardRenderer, BoardView } from "@/render/BoardRenderer";

interface Props extends BoardHandlers {
  view: BoardView;
  className?: string;
}

/** Bridges React to the PixiJS renderer. Pixi is imported lazily so it never runs during SSR. */
export function PixiBoard({ view, onPlay, onDraw, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BoardRenderer | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const handlersRef = useRef<BoardHandlers>({ onPlay, onDraw });
  handlersRef.current = { onPlay, onDraw };

  useEffect(() => {
    let cancelled = false;
    let renderer: BoardRenderer | null = null;
    void import("@/render/BoardRenderer").then(async ({ BoardRenderer }) => {
      if (cancelled || !hostRef.current) return;
      renderer = new BoardRenderer({
        onPlay: (id) => handlersRef.current.onPlay(id),
        onDraw: () => handlersRef.current.onDraw(),
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
