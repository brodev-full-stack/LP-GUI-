import { getDB } from './idb';
import { LPModel } from '../solver/types';

/**
 * Public Storage API for LP Studio IndexedDB persistence
 */

export async function saveModel(model: LPModel): Promise<void> {
  try {
    const db = await getDB();
    const updated = {
      ...model,
      updatedAt: Date.now(),
    };
    await db.put('models', updated);
  } catch (err) {
    console.error('Failed to save model to IndexedDB:', err);
    // Fallback to localStorage if IndexedDB is blocked
    try {
      localStorage.setItem(`lp_model_${model.id}`, JSON.stringify(model));
    } catch {}
  }
}

export async function loadModel(id: string): Promise<LPModel | undefined> {
  try {
    const db = await getDB();
    const model = await db.get('models', id);
    if (model) return model;
  } catch (err) {
    console.error('Failed to load model from IndexedDB:', err);
  }

  // Fallback to localStorage
  try {
    const local = localStorage.getItem(`lp_model_${id}`);
    if (local) return JSON.parse(local);
  } catch {}

  return undefined;
}

export async function listModels(): Promise<LPModel[]> {
  try {
    const db = await getDB();
    const models = await db.getAllFromIndex('models', 'updatedAt');
    return models.reverse(); // Most recent first
  } catch (err) {
    console.error('Failed to list models from IndexedDB:', err);
    return [];
  }
}

export async function deleteModel(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('models', id);
  } catch (err) {
    console.error('Failed to delete model from IndexedDB:', err);
  }
  try {
    localStorage.removeItem(`lp_model_${id}`);
  } catch {}
}

export async function savePreference(key: string, value: unknown): Promise<void> {
  try {
    const db = await getDB();
    await db.put('metadata', {
      key,
      value,
      updatedAt: Date.now(),
    });
  } catch (err) {
    try {
      localStorage.setItem(`lp_pref_${key}`, JSON.stringify(value));
    } catch {}
  }
}

export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    const record = await db.get('metadata', key);
    if (record && record.value !== undefined) {
      return record.value as T;
    }
  } catch (err) {
    console.warn('Metadata read note:', err);
  }

  try {
    const local = localStorage.getItem(`lp_pref_${key}`);
    if (local !== null) {
      return JSON.parse(local) as T;
    }
  } catch {}

  return defaultValue;
}

export { loadModel as getModel, listModels as getAllModels };
