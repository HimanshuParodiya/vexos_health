import { useSyncExternalStore } from "react";

// Nurse validations and manual entries for the flowsheet.
// The backend has no endpoint for these yet, so they are kept per browser in
// localStorage. Swap `load`/`persist` for API calls once an endpoint exists.
//
// Shape: { [mrn]: { entries: { [slotKey]: { [rowId]: { value, by, at } } },
//                   validations: { [slotKey]: { by, at } } } }
// slotKey = `${intervalMinutes}@${slotStartMs}`.
const STORAGE_KEY = "vexos.flowsheet.v1";
const EMPTY_RECORD = Object.freeze({ entries: {}, validations: {} });

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: keep working in memory for this session.
  }
}

let state = load();
const listeners = new Set();

function emit(next) {
  state = next;
  persist(state);
  for (const listener of listeners) listener();
}

function updateRecord(mrn, update) {
  const record = state[mrn] ?? EMPTY_RECORD;
  emit({ ...state, [mrn]: update(record) });
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => state;

export function slotKey(intervalMinutes, slotStartMs) {
  return `${intervalMinutes}@${slotStartMs}`;
}

export const flowsheetStore = {
  // Empty value removes the entry.
  setEntry(mrn, key, rowId, value, by) {
    updateRecord(mrn, (record) => {
      const slot = { ...record.entries[key] };
      if (value === "" || value == null) delete slot[rowId];
      else slot[rowId] = { value, by, at: new Date().toISOString() };
      return { ...record, entries: { ...record.entries, [key]: slot } };
    });
  },

  validate(mrn, keys, by) {
    const at = new Date().toISOString();
    updateRecord(mrn, (record) => ({
      ...record,
      validations: { ...record.validations, ...Object.fromEntries(keys.map((key) => [key, { by, at }])) },
    }));
  },

  unvalidate(mrn, key) {
    updateRecord(mrn, (record) => {
      const validations = { ...record.validations };
      delete validations[key];
      return { ...record, validations };
    });
  },
};

export function useFlowsheetState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useFlowsheetRecord(mrn) {
  const all = useFlowsheetState();
  return (mrn && all[mrn]) || EMPTY_RECORD;
}
