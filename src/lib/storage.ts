/**
 * Accesso a localStorage che non esplode mai e che sa dire se sta davvero
 * salvando. Serve perché in alcune condizioni (navigazione privata su iOS,
 * cookie di terze parti bloccati, quota piena) il browser accetta la
 * chiamata e poi non conserva niente: senza un controllo esplicito l'utente
 * se ne accorge solo quando ha perso i dati.
 */

export type StorageHealth = 'ok' | 'non-disponibile' | 'non-persistente' | 'pieno'

let health: StorageHealth = 'ok'
const listeners = new Set<(h: StorageHealth) => void>()

function setHealth(h: StorageHealth) {
  if (h === health) return
  health = h
  listeners.forEach(fn => fn(h))
}

export function getStorageHealth(): StorageHealth {
  return health
}

export function onStorageHealth(fn: (h: StorageHealth) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Scrive e rilegge una chiave di prova: l'unico modo affidabile di sapere se il salvataggio regge. */
export function probeStorage(): StorageHealth {
  try {
    if (typeof localStorage === 'undefined') {
      setHealth('non-disponibile')
      return health
    }
    const key = '__improvapp_probe__'
    localStorage.setItem(key, '1')
    const back = localStorage.getItem(key)
    localStorage.removeItem(key)
    setHealth(back === '1' ? 'ok' : 'non-persistente')
  } catch {
    setHealth('non-disponibile')
  }
  return health
}

export const safeStorage = {
  getItem(name: string): string | null {
    try {
      return localStorage.getItem(name)
    } catch {
      setHealth('non-disponibile')
      return null
    }
  },
  setItem(name: string, value: string): void {
    try {
      localStorage.setItem(name, value)
      if (localStorage.getItem(name) === null) setHealth('non-persistente')
      else setHealth('ok')
      lastSavedAt = Date.now()
      saveListeners.forEach(fn => fn(lastSavedAt))
    } catch (e) {
      const quota = e instanceof DOMException
        && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      setHealth(quota ? 'pieno' : 'non-disponibile')
    }
  },
  removeItem(name: string): void {
    try {
      localStorage.removeItem(name)
    } catch { /* niente da fare: lo stato è già segnalato altrove */ }
  },
}

/* --------------------------- indicatore di salvataggio -------------------- */

let lastSavedAt = 0
const saveListeners = new Set<(ts: number) => void>()

export function getLastSavedAt(): number {
  return lastSavedAt
}

export function onSaved(fn: (ts: number) => void): () => void {
  saveListeners.add(fn)
  return () => saveListeners.delete(fn)
}

export const STORAGE_MESSAGES: Record<Exclude<StorageHealth, 'ok'>, string> = {
  'non-disponibile':
    'Questo browser non permette di salvare i dati: succede in navigazione privata o con i dati dei siti bloccati. Tutto quello che scrivi andrà perso alla chiusura.',
  'non-persistente':
    'Il browser accetta i dati ma non li conserva. Apri l\'app in una scheda normale (non in navigazione privata) per non perdere quello che scrivi.',
  'pieno':
    'Lo spazio di archiviazione del browser è esaurito: i nuovi dati non vengono salvati. Esporta il JSON dalle impostazioni e libera spazio.',
}
