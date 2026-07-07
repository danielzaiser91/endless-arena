import * as THREE from 'three';
import * as C from '../core/constants';
import { tick } from '../core/tick';
import { enemyHp, isBoss } from '../core/enemies';
import { deserialize, serialize } from '../core/save';
import { initialState, type GameState, type Item } from '../core/state';
import { computeMults, type Mults } from '../core/formulas';
import { setLang, t } from '../i18n';
import { installDevConsole } from '../dev/console';
import { createHud, type Hud } from '../ui/hud';
import { createTabShell, type TabShell } from '../ui/panels/tabs';
import { createScene, type SceneCtx } from './scene';
import { buildHero, buildEnemy, type HeroActor, type EnemyActor } from './actors';
import { TweenManager, easeOutQuad, easeInQuad } from './effects';
import { armFirstGesture, crossfadeMusic, initAudio, playSfx, startMusic } from '../audio/mixer';

const SAVE_KEY = 'endless-arena-save';
const AUTOSAVE_INTERVAL = 10;
const PANEL_REFRESH_INTERVAL = 0.5;
const MAX_OFFLINE_SECONDS = 8 * 3600;
const OFFLINE_CHUNK_SECONDS = 30;
const MAX_FRAME_DT = 0.1;
const VISUAL_ATTACKS_PER_SECOND_CAP = 6;
const SCREEN_SHAKE_DURATION = 0.15;
const SCREEN_SHAKE_MAGNITUDE = 0.08;

export class GameView {
  private state: GameState;
  private scene: SceneCtx;
  private hud: Hud;
  private tabs: TabShell;
  private tweens = new TweenManager();
  private hero: HeroActor;
  private enemy: EnemyActor;
  private attackClock = 0;
  private autosaveClock = 0;
  private panelRefreshClock = 0;
  private lastFrameAt = performance.now();
  private hiddenAt = 0;
  private ttkWarn = false;
  private shakeTimeLeft = 0;
  private raf = 0;

  constructor(container: HTMLElement) {
    this.state = loadState();
    setLang(this.state.lang);

    const canvas = document.createElement('canvas');
    canvas.id = 'arena-canvas';
    container.appendChild(canvas);
    this.scene = createScene(canvas);

    this.hud = createHud(container, { getState: () => this.state, refresh: () => this.tabs.refresh() });
    this.tabs = createTabShell(container, {
      getState: () => this.state,
      fx: { classUp: () => this.playClassUpFx(), ascend: () => this.playAscensionFx() },
    });

    this.hero = buildHero();
    this.scene.heroSlot.add(this.hero.group);

    this.applyOfflineProgress();

    this.enemy = buildEnemy(isBoss(this.state.arenaLevel), hueForLevel(this.state.arenaLevel));
    this.scene.enemySlot.add(this.enemy.group);

    window.addEventListener('beforeunload', () => this.save());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.catchUp(this.hiddenAt);
        this.replaceEnemyInstant();
        this.tabs.refresh();
        this.lastFrameAt = performance.now();
      } else {
        this.hiddenAt = Date.now();
        this.save();
      }
    });

    installDevConsole({ getState: () => this.state, refresh: () => this.tabs.refresh(), save: () => this.save() });

    armFirstGesture(() => {
      initAudio(this.state.audio);
      startMusic();
    });
    document.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName === 'BUTTON') playSfx('click');
    });

    this.hud.update(this.state, computeMults(this.state).dps);

    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    const dt = Math.min(MAX_FRAME_DT, (now - this.lastFrameAt) / 1000);
    this.lastFrameAt = now;

    this.step(dt);

    this.raf = requestAnimationFrame(this.frame);
  };

  private step(dt: number): void {
    const levelBefore = this.state.level;
    const result = tick(this.state, dt);

    if (result.kills > 0) {
      this.onKill(result.drops);
    }
    if (this.state.level > levelBefore) {
      this.playLevelUpFx();
      playSfx('levelup');
    }

    const ttk = result.dps > 0 ? enemyHp(this.state.arenaLevel) / result.dps : Infinity;
    const warnNow = ttk > C.TTK_WARN_SECONDS;
    if (warnNow && !this.ttkWarn) playSfx('error');
    this.ttkWarn = warnNow;

    this.updateAttackSwing(dt, result);
    this.updateHpBar();
    this.tweens.update(dt);
    this.scene.updateCamera(dt);
    this.applyScreenShake(dt);
    this.scene.renderer.render(this.scene.scene, this.scene.camera);

    this.hud.update(this.state, result.dps);

    this.panelRefreshClock += dt;
    if (this.panelRefreshClock >= PANEL_REFRESH_INTERVAL) {
      this.panelRefreshClock = 0;
      this.tabs.refresh();
    }

    this.autosaveClock += dt;
    if (this.autosaveClock >= AUTOSAVE_INTERVAL) {
      this.autosaveClock = 0;
      this.save();
    }
  }

  private updateAttackSwing(dt: number, mults: Mults): void {
    const visualRate = Math.min(VISUAL_ATTACKS_PER_SECOND_CAP, Math.max(0.2, mults.attacksPerSecond));
    const period = 1 / visualRate;
    this.attackClock += dt;
    if (this.attackClock >= period) {
      this.attackClock -= period;
      this.playSwing(Math.random() < mults.critChance);
    }
  }

  /**
   * Crit isn't a discrete event in core — computeMults() bakes crit into a continuous expected-value
   * DPS multiplier (avgCritMult), not per-hit rolls. This local Math.random() roll is purely cosmetic
   * (matches the same probability, decorrelated per swing) and never touches core state.
   */
  private playSwing(isCrit: boolean): void {
    const weaponGroup = this.hero.weaponGroup;
    const startZ = -0.4;
    this.tweens.add(
      0.12,
      (t) => (weaponGroup.rotation.z = startZ - easeInQuad(t) * 1.1),
      () => {
        this.tweens.add(0.18, (t) => (weaponGroup.rotation.z = startZ - 1.1 + easeOutQuad(t) * 1.1));
      },
    );
    this.flashHit(isCrit);
    playSfx(isCrit ? 'crit' : 'hit');
  }

  private flashHit(isCrit: boolean): void {
    const bodyMat = this.enemy.materials[0];
    bodyMat.emissive.set(isCrit ? 0xffcc55 : 0xffffff);
    const duration = isCrit ? 0.16 : 0.08;
    this.tweens.add(duration, (t) => (bodyMat.emissiveIntensity = (isCrit ? 2.2 : 1) * (1 - t)));

    const group = this.enemy.group;
    const baseX = group.position.x;
    const kick = isCrit ? 0.26 : 0.12;
    this.tweens.add(duration, (t) => (group.position.x = baseX + easeOutQuad(1 - Math.abs(t * 2 - 1)) * kick));

    if (isCrit) this.shakeTimeLeft = SCREEN_SHAKE_DURATION;
  }

  /** Screen-shake-lite on crits (implementation.md §12) — applied after the orbit camera each frame. */
  private applyScreenShake(dt: number): void {
    if (this.shakeTimeLeft <= 0) return;
    this.shakeTimeLeft = Math.max(0, this.shakeTimeLeft - dt);
    const magnitude = SCREEN_SHAKE_MAGNITUDE * (this.shakeTimeLeft / SCREEN_SHAKE_DURATION);
    this.scene.camera.position.x += (Math.random() * 2 - 1) * magnitude;
    this.scene.camera.position.y += (Math.random() * 2 - 1) * magnitude;
  }

  private updateHpBar(): void {
    const hp = enemyHp(this.state.arenaLevel);
    const fraction = Math.max(0, Math.min(1, 1 - this.state.combatProgress / hp));
    this.enemy.hpBarFg.scale.x = fraction;
  }

  private onKill(drops: Item[]): void {
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
    playSfx('death');
    if (drops.length > 0) {
      playSfx('loot');
      const bestTier = Math.max(...drops.map((d) => d.tier));
      this.playLootBeamFx(deadEnemy.group.position, bestTier);
    }

    const nextIsBoss = isBoss(this.state.arenaLevel);
    const targetScale = nextIsBoss ? 1.5 : 1;
    this.enemy = buildEnemy(nextIsBoss, hueForLevel(this.state.arenaLevel));
    this.enemy.group.scale.setScalar(0.01);
    this.scene.enemySlot.add(this.enemy.group);
    this.tweens.add(0.3, (t) => this.enemy.group.scale.setScalar(0.01 + easeOutQuad(t) * (targetScale - 0.01)));
  }

  /** Loot beam, colored by the drop's rarity tier (implementation.md §7, §12). */
  private playLootBeamFx(position: THREE.Vector3, tier: number): void {
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.02, 2.4, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: tierColor(tier), transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.copy(position);
    beam.position.y += 1.2;
    this.scene.scene.add(beam);
    this.tweens.add(
      0.6,
      (t) => {
        beam.position.y = position.y + 1.2 + t * 0.6;
        (beam.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - t);
      },
      () => this.scene.scene.remove(beam),
    );
  }

  /** Swaps in a fresh enemy mesh with no death/spawn tween — used after a bulk catch-up. */
  private replaceEnemyInstant(): void {
    this.scene.enemySlot.remove(this.enemy.group);
    this.enemy = buildEnemy(isBoss(this.state.arenaLevel), hueForLevel(this.state.arenaLevel));
    this.scene.enemySlot.add(this.enemy.group);
  }

  /** Level-up ring shockwave (implementation.md §12 effect list). */
  private playLevelUpFx(): void {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.04, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8b64c, transparent: true, opacity: 0.9 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.hero.group.position);
    ring.position.y = 0.05;
    this.scene.scene.add(ring);
    this.tweens.add(
      0.5,
      (t) => {
        const s = 1 + t * 3;
        ring.scale.set(s, s, s);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t);
      },
      () => this.scene.scene.remove(ring),
    );
  }

  /** Class-up ceremony: pillar of light (implementation.md §12). */
  private playClassUpFx(): void {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 4, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.copy(this.hero.group.position);
    pillar.position.y = 2;
    this.scene.scene.add(pillar);
    this.tweens.add(
      1.1,
      (t) => {
        (pillar.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - easeInQuad(t));
        pillar.scale.set(1 + t * 0.6, 1, 1 + t * 0.6);
      },
      () => this.scene.scene.remove(pillar),
    );
    this.playLevelUpFx();
    playSfx('classup');
  }

  /** Ascension: the biggest ceremony — supernova burst + screen flash (implementation.md §9, §12). */
  private playAscensionFx(): void {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, wireframe: true }),
    );
    sphere.position.set(0, 1, 0);
    this.scene.scene.add(sphere);
    this.tweens.add(
      1.4,
      (t) => {
        const s = 1 + easeOutQuad(t) * 9;
        sphere.scale.set(s, s, s);
        (sphere.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      },
      () => this.scene.scene.remove(sphere),
    );

    const flash = document.createElement('div');
    flash.className = 'ascension-flash';
    document.body.appendChild(flash);
    this.tweens.add(
      0.8,
      (t) => (flash.style.opacity = String(0.85 * (1 - easeOutQuad(t)))),
      () => flash.remove(),
    );
    playSfx('ascension');
    crossfadeMusic();
  }

  private applyOfflineProgress(): void {
    if (this.state.savedAt <= 0) return;
    this.catchUp(this.state.savedAt);
  }

  /**
   * Bulk-advances the sim for time spent away — used both for the initial page-load offline
   * progress and for tabs backgrounded via visibilitychange (rAF is throttled/paused while
   * hidden, so the real-time loop alone would silently lose that time — implementation.md §15).
   */
  private catchUp(sinceMsEpoch: number): void {
    if (sinceMsEpoch <= 0) return;
    const elapsed = Math.min(MAX_OFFLINE_SECONDS, (Date.now() - sinceMsEpoch) / 1000);
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
    this.tabs.destroy();
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

/** Common..Mythic (0..5), then Ascended (6+) — matches the rarity ladder in implementation.md §7. */
const TIER_COLORS = [0xcfcfcf, 0x55d17a, 0x4fa8e0, 0xb073e6, 0xf0a23c, 0xe6435c];
function tierColor(tier: number): number {
  return tier < TIER_COLORS.length ? TIER_COLORS[tier] : 0xffffff;
}
