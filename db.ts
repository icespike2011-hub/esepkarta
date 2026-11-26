import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { LocalStudyPack, StoredTaskPack, SyncAttempt } from "./types";

interface EsepDatabase extends DBSchema {
  task_packs: {
    key: string;
    value: StoredTaskPack;
  };
  sync_queue: {
    key: string;
    value: SyncAttempt;
    indexes: { "by-status": string; "by-timestamp": string };
  };
  ai_packs: {
    key: string;
    value: LocalStudyPack;
    indexes: { "by-topic-language": [string, string] };
  };
}

let connection: Promise<IDBPDatabase<EsepDatabase>> | undefined;

function database() {
  if (!connection) {
    connection = openDB<EsepDatabase>("esepkarta-local", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("task_packs")) {
          db.createObjectStore("task_packs", { keyPath: "pack_id" });
        }
        if (!db.objectStoreNames.contains("sync_queue")) {
          const queue = db.createObjectStore("sync_queue", { keyPath: "attempt_id" });
          queue.createIndex("by-status", "status");
          queue.createIndex("by-timestamp", "timestamp");
        }
        if (!db.objectStoreNames.contains("ai_packs")) {
          const packs = db.createObjectStore("ai_packs", { keyPath: "id" });
          packs.createIndex("by-topic-language", ["topic_id", "lang"]);
        }
      }
    });
  }
  return connection;
}

export async function savePack(pack: StoredTaskPack) {
  const db = await database();
  await db.put("task_packs", pack);
}

export async function getPack(packId: string) {
  const db = await database();
  return db.get("task_packs", packId);
}

export async function addAttempt(attempt: SyncAttempt) {
  const db = await database();
  await db.put("sync_queue", attempt);
}

export async function getAttempts() {
  const db = await database();
  return db.getAllFromIndex("sync_queue", "by-timestamp");
}

export async function getPendingAttempts() {
  const db = await database();
  return db.getAllFromIndex("sync_queue", "by-status", "pending");
}

export async function markAttemptSynced(attemptId: string) {
  const db = await database();
  const attempt = await db.get("sync_queue", attemptId);
  if (attempt) await db.put("sync_queue", { ...attempt, status: "synced" });
}

export async function saveStudyPack(pack: LocalStudyPack) {
  const db = await database();
  await db.put("ai_packs", pack);
}

export async function getStudyPack(topicId: string, language: string) {
  const db = await database();
  return db.getFromIndex("ai_packs", "by-topic-language", [topicId, language]);
}
