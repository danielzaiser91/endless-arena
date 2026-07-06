import { tick } from '../core/tick';
import { enemyHp, isBoss } from '../core/enemies';
import { deserialize, serialize } from '../core/save';
import { initialState, type GameState } from '../core/state';
import { t } from '../i18n';
import { createHud, type Hud } from '../ui/hud';
import { createScene, type SceneCtx } from './scene';
import { buildHero, buildEnemy, type HeroActor, type EnemyActor } from './actors';
import { TweenManager, easeOutQuad, easeInQuad } from './effects';

const SAVE_KEY = 'endless-arena-save';
const AUTOSAVE_INTERVAL = 10;
const MAX_OFFLINE_SECONDS = 8 * 3600;
const OFFLINE_CHUNK_SECONDS = 30;
const MAX_FRAME_DT = 0.1;
const VISUAL_ATTACKS_PER_SECOND_CAP = 6;

export class GameView {
  private state: GameState;
  private scene: SceneCtx;
  private hud: Hud;
  private tweens = new TweenManager();
  private hero: HeroActor;
  private enemy: EnemyActor;
  private attackClock = 0;
  private autosaveClock = 0;
  private lastFrameAt = performance.now();
  private raf = 0;

  constructor(container: HTMLElement) {
    this.state = loadState();

    const canvas = document.createElement('canvas');
    canvas.id = 'arena-canvas';
    container.appendChild(canvas);
    this.scene = createScene(canvas);

    this.hud = createHud(container);

    this.hero = buildHero();
    this.scene.heroSlot.add(this.hero.group);

    this.applyOfflineProgress();

    this.enemy = buildEnemy(isBoss(this.state.arenaLevel), hueForLevel(this.state.arenaLevel));
    this.scene.enemySlot.add(this.enemy.group);

    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.lastFrameAt = performance.now();
      else this.save();
    });

    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    const dt = Math.min(MAX_FRAME_DT, (now - this.lastFrameAt) / 1000);
    this.lastFrameAt = now;

    this.step(dt);

    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number): void {
    const killsBefore = this.state.kills;
    const mults = tick(this.state, dt);

    if (this.state.kills > killsBefore) {
      this.onKill();
    }

    this.updateAttackSwing(dt, mults.attacksPerSecond);
    this.updateHpBar();
    this.tweens.update(dt);
    this.scene.updateCamera(dt);
    this.scene.renderer.render(this.scene.scene, this.scene.camera);

    this.hud.update({
      level: this.state.level,
      arenaLevel: this.state.arenaLevel,
      kills: this.state.lifetimeKills,
      gold: this.state.gold,
      dps: mults.dps,
    });

    this.autosaveClock += dt;
    if (this.autosaveClock >= AUTOSAVE_INTERVAL) {
      this.autosaveClock = 0;
      this.save();
    }
  }

  private updateAttackSwing(dt: number, attacksPerSecond: number): void {
    const visualRate = Math.min(VISUAL_ATTACKS_PER_SECOND_CAP, Math.max(0.2, attacksPerSecond));
    const period = 1 / visualRate;
    this.attackClock += dt;
    if (this.attackClock >= period) {
      this.attackClock -= period;
      this.playSwing();
    }
  }

  private playSwing(): void {
    const weaponGroup = this.hero.weaponGroup;
    const startZ = -0.4;
    this.tweens.add(
      0.12,
      (t) => (weaponGroup.rotation.z = startZ - easeInQuad(t) * 1.1),
      () => {
        this.tweens.add(0.18, (t) => (weaponGroup.rotation.z = startZ - 1.1 + easeOutQuad(t) * 1.1));
      },
    );
    this.flashHit();
  }

  private flashHit(): void {
    const bodyMat = this.enemy.materials[0];
    bodyMat.emissive.set(0xffffff);
    this.tweens.add(0.08, (t) => (bodyMat.emissiveIntensity = 1 - t));

    const group = this.enemy.group;
    const baseX = group.position.x;
    this.tweens.add(0.08, (t) => (group.position.x = baseX + easeOutQuad(1 - Math.abs(t * 2 - 1)) * 0.12));
  }

  private updateHpBar(): void {
    const hp = enemyHp(this.state.arenaLevel);
    const fraction = Math.max(0, Math.min(1, 1 - this.state.combatProgress / hp));
    this.enemy.hpBarFg.scale.x = fraction;
  }

  private onKill(): void {
    const deadEnemy = this.enemy;
    const startY = deadEnemy.group.position.y;
    const startScale = deadEnemy.group.scale.x;
    for (const mat of deadEnemy.materials) mat.transparent = true;
    this.tweens.add(
      0.4,
      (t) => {
        deadEnemy.group.position.y = startY - easeInQuad(t) * 0.6;
        deadEnemy.group.scale.setScalar(startScale * (1 - t));
        for (const mat of deadEnemy.materials) mat.opacity = 1 - t;
      },
      () => this.scene.enemySlot.remove(deadEnemy.group),
    );

    const nextIsBoss = isBoss(this.state.arenaLevel);
    const targetScale = nextIsBoss ? 1.5 : 1;
    this.enemy = buildEnemy(nextIsBoss, hueForLevel(this.state.arenaLevel));
    this.enemy.group.scale.setScalar(0.01);
    this.scene.enemySlot.add(this.enemy.group);
    this.tweens.add(0.3, (t) => this.enemy.group.scale.setScalar(0.01 + easeOutQuad(t) * (targetScale - 0.01)));
  }

  private applyOfflineProgress(): void {
    if (this.state.savedAt <= 0) return;
    const elapsed = Math.min(MAX_OFFLINE_SECONDS, (Date.now() - this.state.savedAt) / 1000);
    if (elapsed < 1) return;
    let remaining = elapsed;
    while (remaining > 0) {
      const step = Math.min(OFFLINE_CHUNK_SECONDS, remaining);
      tick(this.state, step);
      remaining -= step;
    }
    const minutes = Math.round(elapsed / 60);
    if (minutes > 0) this.hud.setNote(t('hud.welcomeBack').replace('{m}', String(minutes)));
  }

  save(): void {
    this.state.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, serialize(this.state));
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.scene.dispose();
  }
}

function loadState(): GameState {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return initialState();
  try {
    return deserialize(raw);
  } catch {
    return initialState();
  }
}

function hueForLevel(level: number): number {
  return ((level * 0.13) % 1 + 1) % 1;
}
