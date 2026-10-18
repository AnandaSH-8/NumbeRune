import { Application, Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import type { Card } from "@/engine/types";
import { MatchCardSprite } from "./MatchCardSprite";
import { BOARD_COLORS, CARD_H, CARD_W, DISPLAY_FONT } from "./theme";

/** A card shown in the central arena during a battle. */
export interface ArenaCard {
  readonly card: Card;
  readonly owner: "you" | "cpu";
  /** False while the selection is still secret (shown as a card back). */
  readonly faceUp: boolean;
  /** Dimmed: eliminated by prime power or the 4-to-8 rule in the latest reveal. */
  readonly eliminated?: boolean;
}

export interface MatchBoardView {
  /** The human's hand, face up along the bottom. */
  readonly hand: readonly Card[];
  /** Cards the human may pick right now. */
  readonly selectableIds: ReadonlySet<string>;
  readonly selectedId: string | null;
  /** Number of cards in the computer's hand (shown as backs). */
  readonly opponentCount: number;
  readonly arena: readonly ArenaCard[];
  /** True when the human may pick a card. */
  readonly interactive: boolean;
  readonly reducedMotion: boolean;
}

export interface MatchBoardHandlers {
  onSelect: (cardId: string) => void;
}

const MAX_BACKS = 12;

/** Renders a match with PixiJS. Holds no game rules; emits intents via handlers. */
export class MatchRenderer {
  private app = new Application();
  private root = new Container();
  private sprites = new Map<string, MatchCardSprite>();
  private backs: MatchCardSprite[] = [];
  private arenaLabel = new Text({
    text: "",
    style: { fontFamily: DISPLAY_FONT, fontSize: 13, fontWeight: "700", fill: BOARD_COLORS.charcoal, align: "center" },
  });
  private arenaRing = new Graphics();
  private view: MatchBoardView | null = null;
  private observer: ResizeObserver | null = null;
  private ready = false;
  private destroyed = false;
  private scaleFactor = 1;

  constructor(private handlers: MatchBoardHandlers) {}

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
    this.arenaLabel.anchor.set(0.5);
    this.arenaLabel.alpha = 0.55;
    this.root.addChild(this.arenaRing, this.arenaLabel);
    this.observer = new ResizeObserver(() => {
      this.app.renderer.resize(el.clientWidth, el.clientHeight);
      this.layout(false);
    });
    this.observer.observe(el);
    this.ready = true;
    this.layout(false);
  }

  update(view: MatchBoardView) {
    this.view = view;
    if (this.ready) this.layout(!view.reducedMotion);
  }

  destroy() {
    this.destroyed = true;
    this.observer?.disconnect();
    for (const s of [...this.sprites.values(), ...this.backs]) {
      gsap.killTweensOf([s, s.scale, s.body.scale]);
    }
    if (this.ready) this.app.destroy(true, { children: true });
  }

  private backAt(i: number): MatchCardSprite {
    while (this.backs.length <= i) {
      const b = new MatchCardSprite({ id: `back-${this.backs.length}`, value: 1 });
      b.setFace(false);
      this.backs.push(b);
      this.root.addChild(b);
    }
    return this.backs[i]!;
  }

  private layout(animate: boolean) {
    const view = this.view;
    if (!view) return;
    const W = this.app.renderer.width / this.app.renderer.resolution;
    const H = this.app.renderer.height / this.app.renderer.resolution;
    const s = Math.max(0.55, Math.min(1.1, Math.min(W / 760, H / 640)));
    this.scaleFactor = s;
    const cw = CARD_W * s;
    const ch = CARD_H * s;
    const dur = animate ? 0.45 : 0;
    const tween = (target: object, vars: gsap.TweenVars, tag: string) => {
      if ((target as { destroyed?: boolean }).destroyed) {
        console.error(`TWEEN ON DESTROYED: ${tag}`, new Error("trace").stack);
        return;
      }
      gsap.to(target, vars);
    };

    // Arena ring + label
    this.arenaRing.clear().ellipse(W / 2, H / 2, Math.min(W * 0.34, 300 * s), ch * 0.95).stroke({ width: 2, color: BOARD_COLORS.saffron, alpha: 0.25 });
    this.arenaLabel.position.set(W / 2, H / 2);
    this.arenaLabel.text = view.arena.length === 0 ? "Battle arena" : "";

    // Opponent hand: face-down row at the top
    const n = Math.min(view.opponentCount, MAX_BACKS);
    const backScale = s * 0.58;
    const bStep = Math.min(cw * 0.34, (W - 40) / Math.max(1, n));
    for (let i = 0; i < MAX_BACKS; i++) {
      const b = this.backAt(i);
      if (i < n) {
        b.visible = true;
        b.zIndex = 10 + i;
        tween(b, { x: W / 2 + (i - (n - 1) / 2) * bStep, y: ch * 0.3 + 8, rotation: 0, duration: dur, ease: "power3.out" }, `back ${i}`);
        tween(b.scale, { x: backScale, y: backScale, duration: dur }, `back.scale ${i}`);
      } else {
        b.visible = false;
      }
    }

    const seen = new Set<string>();
    const place = (card: Card, x: number, y: number, rotation: number, z: number, faceUp: boolean, scale = s, alpha = 1) => {
      seen.add(card.id);
      let sprite = this.sprites.get(card.id);
      if (!sprite) {
        sprite = this.createSprite(card);
        sprite.position.set(W / 2, H / 2);
        sprite.scale.set(scale);
      }
      if (sprite.destroyed) console.error(`DESTROYED SPRITE REUSED: ${card.id}`, new Error("trace").stack);
      sprite.base = { x, y, rotation };
      sprite.zIndex = z;
      if (sprite.faceUp !== faceUp) this.flip(sprite, faceUp, dur);
      tween(sprite, { x, y: sprite.hovered ? y - 18 * s : y, rotation, alpha, duration: dur, ease: "power3.out", overwrite: "auto" }, `place ${card.id}`);
      tween(sprite.scale, { x: scale, y: scale, duration: dur, ease: "power3.out" }, `place.scale ${card.id}`);
      return sprite;
    };

    // Arena: cpu cards above center, the human's below
    const cpuCards = view.arena.filter((a) => a.owner === "cpu");
    const myCards = view.arena.filter((a) => a.owner === "you");
    const arenaScale = s * 0.82;
    const row = (cards: typeof cpuCards, y: number, zBase: number) => {
      const step = Math.min(cw * 0.62, (W - 60) / Math.max(1, cards.length));
      cards.forEach((a, i) => {
        const sprite = place(a.card, W / 2 + (i - (cards.length - 1) / 2) * step, y, 0, zBase + i, a.faceUp, arenaScale, a.eliminated ? 0.4 : 1);
        sprite.eventMode = "none";
      });
    };
    row(cpuCards, H / 2 - ch * 0.6, 100);
    row(myCards, H / 2 + ch * 0.6, 110);

    // Player hand: gentle fan along the bottom
    const hand = view.hand;
    const step = Math.min(cw * 0.9, (W - 32 - cw) / Math.max(1, hand.length - 1));
    hand.forEach((c, i) => {
      const off = i - (hand.length - 1) / 2;
      const x = W / 2 + off * step;
      const selected = c.id === view.selectedId;
      const y = H - ch * 0.55 - 12 + Math.abs(off) * Math.abs(off) * 1.2 * s - (selected ? 22 * s : 0);
      const sprite = place(c, x, y, off * 0.035, 200 + i, true);
      const selectable = view.selectableIds.has(c.id);
      sprite.eventMode = view.interactive && selectable ? "static" : "none";
      sprite.cursor = view.interactive && selectable ? "pointer" : "default";
      gsap.to(sprite, { alpha: view.interactive && !selectable ? 0.55 : 1, duration: 0.25 });
    });

    for (const [id, sprite] of this.sprites) {
      if (!seen.has(id)) {
        gsap.killTweensOf([sprite, sprite.scale, sprite.body.scale]);
        sprite.destroy({ children: true });
        this.sprites.delete(id);
      }
    }
  }

  private createSprite(card: Card) {
    const sprite = new MatchCardSprite(card);
    sprite.on("pointerover", () => {
      if (sprite.destroyed || !this.view?.interactive || !this.view.selectableIds.has(card.id)) return;
      sprite.hovered = true;
      if ((sprite as { destroyed?: boolean }).destroyed) console.error("HOVER DESTROYED", new Error("trace").stack);
      gsap.to(sprite, { y: sprite.base.y - 18 * this.scaleFactor, rotation: 0, duration: 0.18, ease: "power2.out" });
    });
    sprite.on("pointerout", () => {
      if (sprite.destroyed) return;
      sprite.hovered = false;
      gsap.to(sprite, { y: sprite.base.y, rotation: sprite.base.rotation, duration: 0.2, ease: "power2.out" });
    });
    sprite.on("pointertap", () => {
      if (sprite.destroyed) return;
      if (this.view?.interactive && this.view.selectableIds.has(card.id)) {
        sprite.hovered = false;
        this.handlers.onSelect(card.id);
      }
    });
    this.sprites.set(card.id, sprite);
    this.root.addChild(sprite);
    return sprite;
  }

  private flip(sprite: MatchCardSprite, faceUp: boolean, dur: number) {
    if (dur === 0) {
      sprite.setFace(faceUp);
      return;
    }
    gsap
      .timeline()
      .to(sprite.body.scale, { x: 0, duration: dur * 0.4, ease: "power2.in" })
      .call(() => {
        if (!sprite.destroyed) sprite.setFace(faceUp);
      })
      .to(sprite.body.scale, { x: 1, duration: dur * 0.4, ease: "power2.out" });
  }
}
