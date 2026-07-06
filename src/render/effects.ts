/** Minimal hand-rolled tween manager — procedural tweens only, no skeletal rig / tween lib (implementation.md §12). */
export interface Tween {
  elapsed: number;
  duration: number;
  onUpdate: (t: number) => void;
  onComplete?: () => void;
}

export class TweenManager {
  private tweens: Tween[] = [];

  add(duration: number, onUpdate: (t: number) => void, onComplete?: () => void): void {
    this.tweens.push({ elapsed: 0, duration, onUpdate, onComplete });
  }

  update(dt: number): void {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.elapsed += dt;
      const t = Math.min(1, tw.elapsed / tw.duration);
      tw.onUpdate(t);
      if (t >= 1) {
        tw.onComplete?.();
        this.tweens.splice(i, 1);
      }
    }
  }

  clear(): void {
    this.tweens.length = 0;
  }
}

export function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInQuad(t: number): number {
  return t * t;
}
