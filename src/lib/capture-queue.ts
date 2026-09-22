/**
 * Очередь быстрого захвата в IndexedDB: если сети нет, запись кладётся сюда,
 * а `CaptureSync` отправляет её на сервер, когда сеть вернётся. Работает во всех
 * браузерах (без Background Sync), синхронизация — при возвращении онлайна/входе.
 */
export type CaptureKind = "task" | "note";
export type CaptureItem = {
  id: string;
  kind: CaptureKind;
  text: string;
  at: number;
};

const DB_NAME = "parviz-capture";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no-idb"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueCapture(item: CaptureItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function allCaptures(): Promise<CaptureItem[]> {
  const db = await openDb();
  const items = await new Promise<CaptureItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as CaptureItem[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => a.at - b.at);
}

export async function removeCapture(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function countCaptures(): Promise<number> {
  try {
    return (await allCaptures()).length;
  } catch {
    return 0;
  }
}
