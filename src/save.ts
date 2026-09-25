export type Lineage = 'openai' | 'anthropic';

export interface SaveData {
  lineage: Lineage;
  formIndex: number;
}

const KEY = 'emergence.save.v1';

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.lineage === 'openai' && typeof data.formIndex === 'number') {
      return { lineage: data.lineage, formIndex: data.formIndex };
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
