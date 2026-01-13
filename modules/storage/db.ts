import { openDB } from "idb";
import { nanoid } from "nanoid";
import type { Script, Settings } from "@/types/messages";

const DB_NAME = "teleprompter-db";
const DB_VERSION = 1;
const SETTINGS_KEY = "settings";

const DEFAULT_SETTINGS: Settings = {
  defaultSpeed: 40,
  defaultFontSize: 48,
  theme: "dark",
  mirrorDefault: false,
  alignDefault: "center",
  alignOffsetDefault: 0,
  fontFamilyDefault: "literata",
  textColorDefault: "#ffffff",
};

const getDb = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("scripts")) {
        const store = db.createObjectStore("scripts", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    },
  });

export const createScript = (title = "Untitled"): Script => {
  const now = Date.now();
  return {
    id: nanoid(8),
    title,
    content: "",
    createdAt: now,
    updatedAt: now,
  };
};

export const listScripts = async (): Promise<Script[]> => {
  const db = await getDb();
  const scripts = await db.getAll("scripts");
  return scripts.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getScript = async (id: string): Promise<Script | undefined> => {
  const db = await getDb();
  return db.get("scripts", id);
};

export const saveScript = async (script: Script) => {
  const db = await getDb();
  await db.put("scripts", { ...script, updatedAt: Date.now() });
};

export const deleteScript = async (id: string) => {
  const db = await getDb();
  await db.delete("scripts", id);
};

export const duplicateScript = async (script: Script) => {
  const copy: Script = {
    ...script,
    id: nanoid(8),
    title: `${script.title} (Copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveScript(copy);
  return copy;
};

export const getSettings = async (): Promise<Settings> => {
  const db = await getDb();
  const existing = await db.get("settings", SETTINGS_KEY);
  if (existing) {
    return { ...DEFAULT_SETTINGS, ...existing } as Settings;
  }
  await db.put("settings", DEFAULT_SETTINGS, SETTINGS_KEY);
  return DEFAULT_SETTINGS;
};

export const saveSettings = async (settings: Settings) => {
  const db = await getDb();
  await db.put("settings", settings, SETTINGS_KEY);
};

export const exportScripts = async (): Promise<string> => {
  const scripts = await listScripts();
  return JSON.stringify({ scripts }, null, 2);
};

export const importScripts = async (json: string) => {
  const parsed = JSON.parse(json) as { scripts?: Script[] };
  if (!parsed.scripts?.length) {
    return [] as Script[];
  }
  const db = await getDb();
  const tx = db.transaction("scripts", "readwrite");
  for (const script of parsed.scripts) {
    const normalized: Script = {
      id: script.id || nanoid(8),
      title: script.title || "Untitled",
      content: script.content || "",
      createdAt: script.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    await tx.store.put(normalized);
  }
  await tx.done;
  return listScripts();
};
