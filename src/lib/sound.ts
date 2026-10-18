import { Howl } from "howler";

export type SoundName = "play" | "draw" | "turn" | "win" | "lose" | "error";

interface Tone {
  freqs: number[];
  dur: number;
  vol: number;
}

const TONES: Record<SoundName, Tone> = {
  play: { freqs: [520, 660], dur: 0.12, vol: 0.35 },
  draw: { freqs: [330], dur: 0.09, vol: 0.3 },
  turn: { freqs: [440], dur: 0.06, vol: 0.18 },
  win: { freqs: [523, 659, 784, 1046], dur: 0.5, vol: 0.35 },
  lose: { freqs: [392, 330, 262], dur: 0.45, vol: 0.3 },
  error: { freqs: [180], dur: 0.12, vol: 0.25 },
};

/** Synthesizes a soft sequence of sine notes into a WAV data URI (no audio assets needed). */
function synthWav({ freqs, dur }: Tone): string {
  const rate = 22050;
  const total = Math.floor(rate * dur);
  const per = Math.floor(total / freqs.length);
  const data = new Int16Array(total);
  for (let i = 0; i < total; i++) {
    const n = Math.min(freqs.length - 1, Math.floor(i / per));
    const t = (i - n * per) / rate;
    const local = (i - n * per) / per;
    const env = Math.min(1, local * 12) * Math.pow(1 - local, 2);
    data[i] = Math.sin(2 * Math.PI * freqs[n]! * t) * env * 0x5fff;
  }
  const buf = new ArrayBuffer(44 + data.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((ch, k) => v.setUint8(o + k, ch.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + data.length * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, data.length * 2, true);
  new Int16Array(buf, 44).set(data);
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

const cache = new Map<SoundName, Howl>();

export function playSound(name: SoundName, volume = 1) {
  if (typeof window === "undefined") return;
  let howl = cache.get(name);
  if (!howl) {
    howl = new Howl({ src: [synthWav(TONES[name])], format: ["wav"] });
    cache.set(name, howl);
  }
  howl.volume(TONES[name].vol * Math.max(0, Math.min(1, volume)));
  howl.play();
}
