import { Application, Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import { topCard } from "@/game/rules";
import type { GameState } from "@/game/types";
import { CardSprite } from "./CardSprite";
import { BOARD_COLORS, CARD_H, CARD_W, DISPLAY_FONT } from "./theme";

export interface BoardView {
  state: GameState;
  playableIds: ReadonlySet<string>;
  /** True when the human may act (their turn, game not over). */
  interactive: boolean;
  canDraw: boolean;
  reducedMotion: boolean;
}

export interface BoardHandlers {
  onPlay: (cardId: string) => void;
  onDraw: () => void;
}

const DISCARD_VISIBLE = 4;

/** Renders a GameState with PixiJS. Holds no game rules; emits intents via handlers. */
export class BoardRenderer {
  private app = new Application();
  private root = new Container();
  private sprites = new Map<string, CardSprite>();
  private pile = new Container();
  private pileGlow = new Graphics();
  private pileCount = new Text({
    text: "",
    style: { fontFamily: DISPLAY_FONT, fontSize: 14, fontWeight: "700", fill: BOARD_COLORS.charcoal },
  });
  private view: BoardView | null = null;
  private observer: ResizeObserver | null = null;
  private ready = false;
  private destroyed = false;
  private scaleFactor = 1;
  private pilePos = { x: 0, y: 0 };

  constructor(private handlers: BoardHandlers) {}

  async init(el: HTMLElement) {
    await this.app.init({
      width: el.clientWidth,
      height: el.clientHeight,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    el.appendChild(this.app.canvas);
    this.root.sortableChildren = true;
    this.app.stage.addChild(this.root);
    this.buildPile();
    this.observer = new ResizeObserver(() => {
      this.app.renderer.resize(el.clientWidth, el.clientHeight);
      this.layout(false);
    });
    this.observer.observe(el);
    this.ready = true;
    this.layout(false);
  }

  setHandlers(h: BoardHandlers) {
    this.handlers = h;
  }

  update(view: BoardView) {
    this.view = view;
    if (this.ready) this.layout(!view.reducedMotion);
  }

  destroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    for (const s of this.sprites.values()) gsap.killTweensOf([s, s.scale, s.body.scale]);
    if (this.ready) this.app.destroy(true, { children: true });
  }

  private buildPile() {
    for (let i = 2; i >= 0; i--) {
      const g = new Graphics()
        .roundRect(i * 2.5, -i * 2.5, CARD_W, CARD_H, 12)
        .fill(BOARD_COLORS.charcoal)
        .stroke({ width: 2, color: BOARD_COLORS.saffron, alpha: i === 0 ? 0.8 : 0.3 });
      this.pile.addChild(g);
    }
    const n = new Text({
      text: "N",
      style: { fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: "800", fill: BOARD_COLORS.saffron },
    });
    n.anchor.set(0.5);
    n.position.set(CARD_W / 2, CARD_H / 2);
    this.pileGlow.roundRect(-8, -14, CARD_W + 20, CARD_H + 22, 18).stroke({ width: 3, color: BOARD_COLORS.saffron });
    this.pileGlow.alpha = 0;
    this.pileCount.anchor.set(0.5, 0);
    this.pileCount.position.set(CARD_W / 2, CARD_H + 8);
    this.pile.addChild(this.pileGlow, n, this.pileCount);
    this.pile.pivot.set(CARD_W / 2, CARD_H / 2);
    this.pile.zIndex = 50;
    this.pile.eventMode = "static";
    this.pile.on("pointertap", () => {
      if (this.view?.interactive && this.view.canDraw) this.handlers.onDraw();
    });
    this.root.addChild(this.pile);
  }

  private layout(animate: boolean) {
    const view = this.view;
    if (!view) return;
    const { state } = view;
    const W = this.app.renderer.width / this.app.renderer.resolution;
    const H = this.app.renderer.height / this.app.renderer.resolution;
    const s = Math.max(0.55, Math.min(1.15, Math.min(W / 720, H / 620)));
    this.scaleFactor = s;
    const cw = CARD_W * s;
    const ch = CARD_H * s;
    const dur = animate ? 0.45 : 0;

    // Center piles
    this.pilePos = { x: W / 2 - cw * 0.8, y: H / 2 };
    this.pile.position.set(this.pilePos.x, this.pilePos.y);
    this.pile.scale.set(s);
    this.pile.visible = state.drawPile.length > 0 || state.discard.length > 1;
    this.pileCount.text = `${state.drawPile.length} left`;
    this.pile.cursor = view.interactive && view.canDraw ? "pointer" : "default";
    const suggestDraw = view.interactive && view.canDraw && view.playableIds.size === 0;
    gsap.to(this.pileGlow, { alpha: suggestDraw ? 0.9 : 0, duration: 0.3 });

    const seen = new Set<string>();
    const place = (
      id: string,
      x: number,
      y: number,
      rotation: number,
      z: number,
      faceUp: boolean,
      scale = s,
    ) => {
      seen.add(id);
      const card =
        state.hands.player.find((c) => c.id === id) ??
        state.hands.cpu.find((c) => c.id === id) ??
        state.discard.find((c) => c.id === id)!;
      let sprite = this.sprites.get(id);
      if (!sprite) {
        sprite = this.createSprite(card);
        sprite.position.set(this.pilePos.x, this.pilePos.y);
        sprite.scale.set(s);
        sprite.rotation = 0;
      }
      sprite.base = { x, y, rotation };
      sprite.zIndex = z;
      if (sprite.faceUp !== faceUp) this.flip(sprite, faceUp, dur);
      gsap.to(sprite, { x, y: sprite.hovered ? y - 18 * s : y, rotation, duration: dur, ease: "power3.out", overwrite: "auto" });
      gsap.to(sprite.scale, { x: scale, y: scale, duration: dur, ease: "power3.out" });
      return sprite;
    };

    // Discard: last few cards, slight organic rotation
    const disc = state.discard.slice(-DISCARD_VISIBLE);
    const dx = W / 2 + cw * 0.8;
    disc.forEach((c, i) => {
      const seed = (c.value * 37 + c.rune.length * 11) % 13;
      place(c.id, dx + (seed - 6) * 0.6 * s, H / 2 + (seed % 5 - 2) * s, (seed - 6) * 0.018, 100 + i, true);
    });

    // CPU hand: face down, compact row at top
    const cpu = state.hands.cpu;
    const cpuScale = s * 0.72;
    const cpuStep = Math.min(cw * 0.42, (W - 40 - cw * 0.72) / Math.max(1, cpu.length - 1));
    cpu.forEach((c, i) => {
      const x = W / 2 + (i - (cpu.length - 1) / 2) * cpuStep;
      place(c.id, x, ch * 0.36 + 14, 0, 10 + i, false, cpuScale);
    });

    // Player hand: gentle fan along the bottom
    const hand = state.hands.player;
    const step = Math.min(cw * 0.9, (W - 32 - cw) / Math.max(1, hand.length - 1));
    hand.forEach((c, i) => {
      const off = i - (hand.length - 1) / 2;
      const x = W / 2 + off * step;
      const y = H - ch * 0.55 - 12 + Math.abs(off) * Math.abs(off) * 1.2 * s;
      const sprite = place(c.id, x, y, off * 0.035, 200 + i, true);
      const playable = view.playableIds.has(c.id);
      sprite.eventMode = view.interactive ? "static" : "none";
      sprite.cursor = view.interactive && playable ? "pointer" : "default";
      gsap.to(sprite, { alpha: view.interactive && !playable ? 0.55 : 1, duration: 0.25 });
    });

    for (const [id, sprite] of this.sprites) {
      if (!seen.has(id)) {
        gsap.killTweensOf([sprite, sprite.scale, sprite.body.scale]);
        sprite.destroy({ children: true });
        this.sprites.delete(id);
      }
    }
  }

  private createSprite(card: GameState["discard"][number]) {
    const sprite = new CardSprite(card);
    sprite.on("pointerover", () => {
      if (!this.view?.interactive || !this.view.playableIds.has(card.id)) return;
      sprite.hovered = true;
      gsap.to(sprite, { y: sprite.base.y - 18 * this.scaleFactor, rotation: 0, duration: 0.18, ease: "power2.out" });
    });
    sprite.on("pointerout", () => {
      sprite.hovered = false;
      gsap.to(sprite, { y: sprite.base.y, rotation: sprite.base.rotation, duration: 0.2, ease: "power2.out" });
    });
    sprite.on("pointertap", () => {
      if (this.view?.interactive && this.view.playableIds.has(card.id)) {
        sprite.hovered = false;
        this.handlers.onPlay(card.id);
      }
    });
    this.sprites.set(card.id, sprite);
    this.root.addChild(sprite);
    return sprite;
  }

  private flip(sprite: CardSprite, faceUp: boolean, dur: number) {
    if (dur === 0) {
      sprite.setFace(faceUp);
      return;
    }
    gsap
      .timeline()
      .to(sprite.body.scale, { x: 0, duration: dur * 0.4, ease: "power2.in" })
      .call(() => sprite.setFace(faceUp))
      .to(sprite.body.scale, { x: 1, duration: dur * 0.4, ease: "power2.out" });
  }
}
