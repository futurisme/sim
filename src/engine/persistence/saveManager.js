import { MANUAL_SAVES_KEY } from '../constants.js';
import { normalizeUserPrefs } from '../themeEngine.js';

const SAVE_FORMAT = 'IZUMIYA_SAVE_V2';
const SAVE_SCHEMA_VERSION = 2;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Dual-lane deterministic 64-bit FNV-1a integrity checksum over canonical JSON.
 */
export function computeSaveChecksum(payload) {
  const json = canonicalStringify(payload);
  let h1 = 0x811c9dc5;
  let h2 = 0x050c5d1f;
  for (let i = 0; i < json.length; i++) {
    const code = json.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= (code + i) & 0xff;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}-${h2.toString(16).padStart(8, '0')}`;
}

function canonicalStringify(val) {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return `[${val.map((item) => canonicalStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(val)
    .filter((k) => !FORBIDDEN_KEYS.has(k) && val[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(val[k])}`).join(',')}}`;
}

export function stripUnsafeKeys(node, depth = 0) {
  if (depth > 28) return null;
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    return node.map((item) => stripUnsafeKeys(item, depth + 1));
  }
  const clean = {};
  for (const [k, v] of Object.entries(node)) {
    if (FORBIDDEN_KEYS.has(k) || v === undefined) continue;
    clean[k] = stripUnsafeKeys(v, depth + 1);
  }
  return clean;
}

export function createSaveEnvelope(state, prefs = null, slotName = 'Simpanan Manual') {
  const safeState = stripUnsafeKeys(state);
  const safePrefs = prefs ? normalizeUserPrefs(prefs) : null;
  const payload = {
    state: safeState,
    prefs: safePrefs,
  };
  const simHours = Math.floor((safeState?.simSeconds || 0) / 3600) % 24;
  const simMins = Math.floor(((safeState?.simSeconds || 0) % 3600) / 60);
  const clock = `${String(simHours).padStart(2, '0')}:${String(simMins).padStart(2, '0')}`;

  return {
    format: SAVE_FORMAT,
    schemaVersion: SAVE_SCHEMA_VERSION,
    engineBuild: '2026-11-20',
    savedAt: new Date().toISOString(),
    slotName: String(slotName || 'Simpanan Manual').trim().slice(0, 48) || 'Simpanan Manual',
    summary: {
      ownerName: String(safeState?.ownerName || 'Kapolda').slice(0, 40),
      memberCount: Array.isArray(safeState?.members) ? safeState.members.length : 0,
      rankCount: Array.isArray(safeState?.ranks) ? safeState.ranks.length : 0,
      divisionCount: Array.isArray(safeState?.divisions) ? safeState.divisions.length : 0,
      reputation: Math.round(Number(safeState?.reputation || 0)),
      clock,
      themeId: safePrefs?.themeId || 'discord-midnight',
    },
    checksum: computeSaveChecksum(payload),
    payload,
  };
}

export function validateAndRestoreEnvelope(rawInput, hydrateStateFn = null) {
  let parsed;
  try {
    parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  } catch {
    return { ok: false, error: 'Format JSON tidak valid atau file terpotong.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Struktur file save rusak (bukan objek save).' };
  }

  const cleanEnvelope = stripUnsafeKeys(parsed);
  if (cleanEnvelope.format !== SAVE_FORMAT) {
    return { ok: false, error: 'Header format tidak dikenali sebagai save Kepolisian Izumiya v2.' };
  }
  if (!cleanEnvelope.payload || typeof cleanEnvelope.payload !== 'object') {
    return { ok: false, error: 'Data payload save hilang atau kosong.' };
  }

  const expectedChecksum = computeSaveChecksum(cleanEnvelope.payload);
  if (cleanEnvelope.checksum !== expectedChecksum) {
    return {
      ok: false,
      error: 'Checksum integritas tidak cocok! File mungkin korup atau dimodifikasi tidak sah.',
    };
  }

  const candidateState = cleanEnvelope.payload.state;
  const candidatePrefs = cleanEnvelope.payload.prefs
    ? normalizeUserPrefs(cleanEnvelope.payload.prefs)
    : null;

  const structCheck = validateCoreStateStructure(candidateState);
  if (!structCheck.ok) {
    return structCheck;
  }

  const hydratedState = hydrateStateFn ? hydrateStateFn(candidateState) : candidateState;
  if (!hydratedState) {
    return { ok: false, error: 'Gagal merekonstruksi state simulasi dari save.' };
  }

  return {
    ok: true,
    state: hydratedState,
    prefs: candidatePrefs,
    envelope: cleanEnvelope,
  };
}

export function validateCoreStateStructure(st) {
  if (!st || typeof st !== 'object') {
    return { ok: false, error: 'Objek state simulasi tidak ditemukan.' };
  }
  if (!Array.isArray(st.members) || !Array.isArray(st.ranks) || !Array.isArray(st.divisions)) {
    return { ok: false, error: 'Data inti anggota/pangkat/divisi tidak valid.' };
  }
  if (st.ranks.length < 2) {
    return { ok: false, error: 'Daftar pangkat dalam save terlalu sedikit / rusak.' };
  }
  if (!st.player || typeof st.player.x !== 'number' || typeof st.player.y !== 'number') {
    return { ok: false, error: 'Koordinat karakter Kapolda korup.' };
  }
  if (!st.messages || typeof st.messages !== 'object') {
    return { ok: false, error: 'Arsip channel Discord korup.' };
  }
  return { ok: true };
}

export function listSaveSlots() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANUAL_SAVES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((slot) => slot && typeof slot === 'object' && slot.id && slot.envelope)
      .map((slot) => ({
        ...slot,
        integrityOk:
          slot.envelope.format === SAVE_FORMAT &&
          Boolean(slot.envelope.payload) &&
          slot.envelope.checksum === computeSaveChecksum(slot.envelope.payload),
      }));
  } catch {
    return [];
  }
}

function writeSaveSlots(slots) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(MANUAL_SAVES_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

export function saveToManualSlot(state, prefs, slotName = 'Simpanan Manual', overwriteSlotId = null) {
  const slots = listSaveSlots().map(({ integrityOk: _ignored, ...rest }) => rest);
  const envelope = createSaveEnvelope(state, prefs, slotName);
  const slotId = overwriteSlotId || `slot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const record = { id: slotId, updatedAt: envelope.savedAt, envelope };

  const idx = slots.findIndex((s) => s.id === slotId);
  if (idx >= 0) {
    slots[idx] = record;
  } else {
    slots.unshift(record);
    if (slots.length > 8) slots.length = 8;
  }

  const persisted = writeSaveSlots(slots);
  return persisted
    ? { ok: true, slot: record }
    : { ok: false, error: 'Memori penyimpanan browser penuh.' };
}

export function loadFromManualSlot(slotId, hydrateStateFn = null) {
  const slots = listSaveSlots();
  const target = slots.find((s) => s.id === slotId);
  if (!target) {
    return { ok: false, error: 'Slot simpanan tidak ditemukan.' };
  }
  return validateAndRestoreEnvelope(target.envelope, hydrateStateFn);
}

export function deleteManualSlot(slotId) {
  const slots = listSaveSlots()
    .filter((s) => s.id !== slotId)
    .map(({ integrityOk: _ignored, ...rest }) => rest);
  return writeSaveSlots(slots);
}

export function exportSaveJsonString(state, prefs, slotName = 'Backup Izumiya') {
  const envelope = createSaveEnvelope(state, prefs, slotName);
  return JSON.stringify(envelope, null, 2);
}
