import type { Lineage } from './config/types';
import type { SerializedRun } from './game/RunState';

export interface SaveData {
  lineage: Lineage;
  formIndex: number;
  run?: SerializedRun;
  /** Event ids already played. */
  done?: string[];
  /** Score so far this run. */
  score?: number;
}

export interface Settings {
  audio: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  /** 'auto' picks by device; 'low' halves particles and turns bloom down. */
  quality: 'auto' | 'high' | 'low';
}

const KEY = 'emergence.save.v2';
const SETTINGS_KEY = 'emergence.settings.v1';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;
    if ((data.lineage === 'gpt' || data.lineage === 'claude') && typeof data.formIndex === 'number') {
      return { lineage: data.lineage, formIndex: data.formIndex, run: data.run, done: data.done, score: data.score };
    }
  } catch {
    // Storage blocked or corrupt: start fresh.
  }
  return null;
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (private mode, etc.): progress just isn't kept.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

export function loadSettings(): Settings {
  const defaults: Settings = {
    audio: true,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    largeText: false,
    quality: 'auto',
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : defaults;
  } catch {
    return defaults;
  }
}

export function writeSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Not persisted.
  }
}
