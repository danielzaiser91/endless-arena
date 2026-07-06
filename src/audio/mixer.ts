import type { AudioSettings } from '../core/state';

/**
 * Tiny WebAudio mixer (implementation.md §13): master/music/sfx gain + mute.
 * Starts only after the first user gesture (browser autoplay policy).
 */
const BASE = import.meta.env.BASE_URL;

export type SfxKey = 'hit' | 'crit' | 'death' | 'loot' | 'levelup' | 'classup' | 'ascension' | 'click' | 'error';

const SFX_FILES: Record<SfxKey, string> = {
  hit: 'audio/sfx/hit.ogg',
  crit: 'audio/sfx/crit.ogg',
  death: 'audio/sfx/death.ogg',
  loot: 'audio/sfx/loot.ogg',
  levelup: 'audio/sfx/levelup.ogg',
  classup: 'audio/sfx/classup.ogg',
  ascension: 'audio/sfx/ascension.ogg',
  click: 'audio/sfx/click.ogg',
  error: 'audio/sfx/error.ogg',
};

const MUSIC_FILES = ['audio/music/track1.ogg', 'audio/music/track2.ogg'];

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGainA: GainNode | null = null;
let musicGainB: GainNode | null = null;
let musicSourceA: AudioBufferSourceNode | null = null;
let musicSourceB: AudioBufferSourceNode | null = null;
let activeMusicSlot: 'a' | 'b' = 'a';

const bufferCache = new Map<string, Promise<AudioBuffer>>();
let settings: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.8, muted: false };

function loadBuffer(url: string): Promise<AudioBuffer> {
  if (!ctx) return Promise.reject(new Error('audio not initialized'));
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const promise = fetch(BASE + url)
    .then((res) => res.arrayBuffer())
    .then((buf) => ctx!.decodeAudioData(buf));
  bufferCache.set(url, promise);
  return promise;
}

function applyVolumes(): void {
  if (!ctx || !masterGain || !sfxGain || !musicGainA || !musicGainB) return;
  masterGain.gain.value = settings.muted ? 0 : settings.master;
  sfxGain.gain.value = settings.sfx;
  const musicTarget = settings.music;
  (activeMusicSlot === 'a' ? musicGainA : musicGainB).gain.value = musicTarget;
}

let initialized = false;

/** Must be called from within a user-gesture event handler (click/keydown/touchstart). */
export function initAudio(initialSettings: AudioSettings): void {
  if (initialized) return;
  initialized = true;
  settings = initialSettings;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  sfxGain = ctx.createGain();
  sfxGain.connect(masterGain);
  musicGainA = ctx.createGain();
  musicGainA.connect(masterGain);
  musicGainB = ctx.createGain();
  musicGainB.gain.value = 0;
  musicGainB.connect(masterGain);
  applyVolumes();

  for (const url of Object.values(SFX_FILES)) void loadBuffer(url);
  for (const url of MUSIC_FILES) void loadBuffer(url);
}

export function isAudioInitialized(): boolean {
  return initialized;
}

export function updateVolumes(newSettings: AudioSettings): void {
  settings = newSettings;
  applyVolumes();
}

export function playSfx(key: SfxKey): void {
  if (!ctx || !sfxGain) return;
  loadBuffer(SFX_FILES[key])
    .then((buffer) => {
      if (!ctx || !sfxGain) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(sfxGain);
      source.start();
    })
    .catch(() => { /* best-effort — never break gameplay over a missing sound */ });
}

export function startMusic(): void {
  if (!ctx || !musicGainA) return;
  loadBuffer(MUSIC_FILES[0]).then((buffer) => {
    if (!ctx || !musicGainA || musicSourceA) return;
    musicSourceA = ctx.createBufferSource();
    musicSourceA.buffer = buffer;
    musicSourceA.loop = true;
    musicSourceA.connect(musicGainA);
    musicSourceA.start();
  }).catch(() => { /* best-effort */ });
}

const CROSSFADE_SECONDS = 2;

/** Crossfades to the other music track — used on Ascension (implementation.md §13). */
export function crossfadeMusic(): void {
  if (!ctx || !musicGainA || !musicGainB) return;
  const now = ctx.currentTime;
  const nextSlot = activeMusicSlot === 'a' ? 'b' : 'a';
  const nextUrl = MUSIC_FILES[nextSlot === 'a' ? 0 : 1];

  loadBuffer(nextUrl).then((buffer) => {
    if (!ctx || !musicGainA || !musicGainB) return;
    const outGain = activeMusicSlot === 'a' ? musicGainA : musicGainB;
    const inGain = nextSlot === 'a' ? musicGainA : musicGainB;

    const nextSource = ctx.createBufferSource();
    nextSource.buffer = buffer;
    nextSource.loop = true;
    nextSource.connect(inGain);
    inGain.gain.cancelScheduledValues(now);
    inGain.gain.setValueAtTime(0, now);
    inGain.gain.linearRampToValueAtTime(settings.muted ? 0 : settings.music, now + CROSSFADE_SECONDS);
    nextSource.start();

    outGain.gain.cancelScheduledValues(now);
    outGain.gain.setValueAtTime(outGain.gain.value, now);
    outGain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS);

    const oldSource = activeMusicSlot === 'a' ? musicSourceA : musicSourceB;
    setTimeout(() => oldSource?.stop(), CROSSFADE_SECONDS * 1000 + 200);

    if (nextSlot === 'a') musicSourceA = nextSource; else musicSourceB = nextSource;
    activeMusicSlot = nextSlot;
  }).catch(() => { /* best-effort */ });
}

/** Arms a one-time listener for the first user gesture, then runs the callback (browser autoplay policy). */
export function armFirstGesture(onFirstGesture: () => void): void {
  const events: Array<keyof DocumentEventMap> = ['pointerdown', 'keydown', 'touchstart'];
  function handler(): void {
    for (const e of events) document.removeEventListener(e, handler);
    onFirstGesture();
  }
  for (const e of events) document.addEventListener(e, handler, { once: true });
}
