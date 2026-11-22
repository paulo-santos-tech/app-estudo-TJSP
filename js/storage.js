/**
 * Persistência Local Robusta para Tablet (IndexedDB + localStorage)
 * Armazena páginas S Pen, aulas IA, rascunhos e fontes de estudo locais.
 */
const DB_NAME = 'tjsp2027_caderno_db';
const DB_VERSION = 2;
const STORE_PAGES = 'saved_pages';
const STORE_LESSONS = 'custom_lessons';
const STORE_DRAFTS = 'drafts';
const STORE_SOURCES = 'study_sources';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        db.createObjectStore(STORE_PAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LESSONS)) {
        db.createObjectStore(STORE_LESSONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_SOURCES)) {
        db.createObjectStore(STORE_SOURCES, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onblocked = () => {
      reject(new Error('IndexedDB bloqueado por outra aba'));
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getAllFromStore(storeName) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function putInStore(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromStore(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getFromStore(storeName, key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function migrateLegacyLocalStoragePages() {
  try {
    const raw = localStorage.getItem('tjsp2027_saved_pages');
    if (!raw) return;
    const legacy = JSON.parse(raw);
    if (Array.isArray(legacy) && legacy.length > 0) {
      for (const page of legacy) {
        await putInStore(STORE_PAGES, page);
      }
      localStorage.removeItem('tjsp2027_saved_pages');
    }
  } catch {
    // Ignora falha de migração silenciosamente
  }
}

export async function loadSavedPages() {
  await migrateLegacyLocalStoragePages();
  const pages = await getAllFromStore(STORE_PAGES);
  return pages.sort((a, b) => (b.id || 0) - (a.id || 0));
}

export async function savePageToDB(page) {
  await putInStore(STORE_PAGES, page);
}

export async function deletePageFromDB(id) {
  await deleteFromStore(STORE_PAGES, id);
}

export async function loadCustomLessons() {
  const lessons = await getAllFromStore(STORE_LESSONS);
  return lessons.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function saveCustomLessonToDB(lesson) {
  await putInStore(STORE_LESSONS, lesson);
}

export async function loadStudySources() {
  const sources = await getAllFromStore(STORE_SOURCES);
  return sources.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function saveStudySourceToDB(source) {
  await putInStore(STORE_SOURCES, source);
}

export async function deleteStudySourceFromDB(id) {
  await deleteFromStore(STORE_SOURCES, id);
}

export async function saveCanvasDraft(pages, currentPageIdx = 0) {
  try {
    await putInStore(STORE_DRAFTS, {
      key: 'active_canvas',
      pages,
      currentPageIdx,
      updatedAt: Date.now()
    });
  } catch {
    // Falha silenciosa se IndexedDB estiver bloqueado
  }
}

export async function loadCanvasDraft() {
  const draft = await getFromStore(STORE_DRAFTS, 'active_canvas');
  if (!draft) return { pages: [[]], currentPageIdx: 0 };
  if (Array.isArray(draft.pages) && draft.pages.length > 0) {
    return {
      pages: draft.pages,
      currentPageIdx: Math.min(draft.currentPageIdx || 0, draft.pages.length - 1)
    };
  }
  if (Array.isArray(draft.strokes) && draft.strokes.length > 0) {
    return { pages: [draft.strokes], currentPageIdx: 0 };
  }
  return { pages: [[]], currentPageIdx: 0 };
}

export function getLocalJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Evita crash em modo privado ou cota cheia
  }
}
