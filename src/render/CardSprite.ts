import { Container, Graphics, Text } from "pixi.js";
import type { Card, Rune } from "@/game/types";
import { BOARD_COLORS, CARD_H, CARD_W, DISPLAY_FONT, RUNE_COLORS } from "./theme";

export function drawRune(g: Graphics, rune: Rune, cx: number, cy: number, s: number, color: number, bg: number) {
  switch (rune) {
    case "sun":
      g.circle(cx, cy, s * 0.55).fill(color);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(cx + Math.cos(a) * s * 0.75, cy + Math.sin(a) * s * 0.75)
          .lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s)
          .stroke({ width: Math.max(1.5, s * 0.14), color, cap: "round" });
      }
      break;
    case "moon":
      g.circle(cx, cy, s * 0.85).fill(color);
      g.circle(cx + s * 0.4, cy - s * 0.25, s * 0.7).fill(bg);
      break;
    case "leaf":
      g.poly([cx, cy - s, cx + s * 0.65, cy, cx, cy + s, cx - s * 0.65, cy]).fill(color);
      g.moveTo(cx, cy - s * 0.6).lineTo(cx, cy + s * 0.6).stroke({ width: Math.max(1, s * 0.1), color: bg });
      break;
    case "tide":
      for (let k = -1; k <= 1; k++) {
        const y = cy + k * s * 0.5;
        g.moveTo(cx - s, y)
          .bezierCurveTo(cx - s * 0.5, y - s * 0.4, cx, y + s * 0.4, cx + s * 0.5, y - s * 0.1)
          .lineTo(cx + s, y - s * 0.2)
          .stroke({ width: Math.max(1.5, s * 0.16), color, cap: "round" });
      }
      break;
  }
}

/** A single card display object. Logic-free: it only knows how to look. */
export class CardSprite extends Container {
  readonly body = new Container();
  private readonly face = new Container();
  private readonly back = new Container();
  private readonly shadow = new Graphics();
  faceUp = false;
  base = { x: 0, y: 0, rotation: 0 };
  hovered = false;

  constructor(readonly card: Card) {
    super();
    this.pivot.set(CARD_W / 2, CARD_H / 2);
    this.shadow.roundRect(2, 6, CARD_W, CARD_H, 12).fill({ color: BOARD_COLORS.shadow, alpha: 0.16 });
    this.body.pivot.set(CARD_W / 2, 0);
    this.body.x = CARD_W / 2;
    this.buildFace();
    this.buildBack();
    this.body.addChild(this.face, this.back);
    this.addChild(this.shadow, this.body);
    this.setFace(false);
  }

  private buildFace() {
    const color = RUNE_COLORS[this.card.rune];
    const g = new Graphics()
      .roundRect(0, 0, CARD_W, CARD_H, 12)
      .fill(BOARD_COLORS.ivory)
      .stroke({ width: 2, color: BOARD_COLORS.ivoryEdge })
      .roundRect(6, 6, CARD_W - 12, CARD_H - 12, 8)
      .stroke({ width: 2.5, color, alpha: 0.85 });
    const sym = new Graphics();
    drawRune(sym, this.card.rune, CARD_W / 2, 106, 11, color, BOARD_COLORS.ivory);
    drawRune(sym, this.card.rune, 20, 38, 5, color, BOARD_COLORS.ivory);
    const big = new Text({
      text: String(this.card.value),
      style: { fontFamily: DISPLAY_FONT, fontSize: 54, fontWeight: "800", fill: color },
    });
    big.anchor.set(0.5);
    big.position.set(CARD_W / 2, 62);
    const corner = new Text({
      text: String(this.card.value),
      style: { fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: "700", fill: color },
    });
    corner.anchor.set(0.5);
    corner.position.set(20, 21);
    this.face.addChild(g, sym, big, corner);
  }

  private buildBack() {
    const g = new Graphics()
      .roundRect(0, 0, CARD_W, CARD_H, 12)
      .fill(BOARD_COLORS.charcoal)
      .roundRect(7, 7, CARD_W - 14, CARD_H - 14, 8)
      .stroke({ width: 2, color: BOARD_COLORS.saffron, alpha: 0.7 })
      .poly([CARD_W / 2, 38, CARD_W - 28, CARD_H / 2, CARD_W / 2, CARD_H - 38, 28, CARD_H / 2])
      .stroke({ width: 2, color: BOARD_COLORS.saffron, alpha: 0.5 });
    const n = new Text({
      text: "N",
      style: { fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: "800", fill: BOARD_COLORS.saffron },
    });
    n.anchor.set(0.5);
    n.position.set(CARD_W / 2, CARD_H / 2);
    this.back.addChild(g, n);
  }

  setFace(up: boolean) {
    this.faceUp = up;
    this.face.visible = up;
    this.back.visible = !up;
  }
}
