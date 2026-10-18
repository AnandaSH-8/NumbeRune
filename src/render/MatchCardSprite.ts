import { Container, Graphics, Text } from "pixi.js";
import gsap from "gsap";
import { isPrime } from "@/engine/resolution";
import type { Card } from "@/engine/types";
import { BOARD_COLORS, CARD_H, CARD_W, DISPLAY_FONT, VALUE_COLORS } from "./theme";

/** A single number card. Logic-free: it only knows how to look. */
export class MatchCardSprite extends Container {
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
    const color = VALUE_COLORS[this.card.value] ?? BOARD_COLORS.charcoal;
    const g = new Graphics()
      .roundRect(0, 0, CARD_W, CARD_H, 12)
      .fill(BOARD_COLORS.ivory)
      .stroke({ width: 2, color: BOARD_COLORS.ivoryEdge })
      .roundRect(6, 6, CARD_W - 12, CARD_H - 12, 8)
      .stroke({ width: 2.5, color, alpha: 0.85 });
    const big = new Text({
      text: String(this.card.value),
      style: { fontFamily: DISPLAY_FONT, fontSize: 58, fontWeight: "800", fill: color },
    });
    big.anchor.set(0.5);
    big.position.set(CARD_W / 2, CARD_H / 2);
    const corner = new Text({
      text: String(this.card.value),
      style: { fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: "700", fill: color },
    });
    corner.anchor.set(0.5);
    corner.position.set(20, 21);
    this.face.addChild(g, big, corner);
    if (isPrime(this.card.value)) {
      // Small diamond marks a prime.
      const d = new Graphics().poly([CARD_W - 20, 12, CARD_W - 12, 20, CARD_W - 20, 28, CARD_W - 28, 20]).fill(color);
      this.face.addChild(d);
    }
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

  /** Kill GSAP tweens first so no animation ever touches a destroyed sprite. */
  override destroy(options?: Parameters<Container["destroy"]>[0]) {
    gsap.killTweensOf([this, this.scale, this.body.scale]);
    super.destroy(options);
  }
}
