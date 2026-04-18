import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../cache');
const CACHE_FILE = join(CACHE_DIR, 'prices-de.json');
const TTL_MS = 6 * 60 * 60 * 1000; // 6 heures

function load() {
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')); }
  catch { return {}; }
}

function save(data) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(data));
}

export function getCached(key) {
  const entry = load()[key];
  if (!entry || Date.now() - entry.ts > TTL_MS) return null;
  return entry.value;
}

export function setCached(key, value) {
  const data = load();
  data[key] = { ts: Date.now(), value };
  save(data);
}
