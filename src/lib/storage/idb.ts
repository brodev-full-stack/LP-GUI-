import { openDB, IDBPDatabase } from 'idb';
import { LPModel } from '../solver/types';

export const DB_NAME = 'lp-studio';
export const DB_VERSION = 1;

export interface LPStudioDBSchema {
  models: {
    key: string;
    value: LPModel;
    indexes: {
      name: string;
      updatedAt: number;
      createdAt: number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<LPStudioDBSchema>> | null = null;

export async function getDB(): Promise<IDBPDatabase<LPStudioDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LPStudioDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          // Models store
          const modelStore = db.createObjectStore('models', { keyPath: 'id' });
          modelStore.createIndex('name', 'name', { unique: false });
          modelStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          modelStore.createIndex('createdAt', 'createdAt', { unique: false });

          // Metadata store (user preferences, active model id, language)
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}
