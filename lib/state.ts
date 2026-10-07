import curriculum from './curriculum.json';
export type Stored = Record<string, string | number | boolean>;
const tasks = new Set(curriculum.modules.flatMap(m => m.tasks.map((_, i) => `${m.id}-${i}`)));
const modules = new Set(curriculum.modules.map(m => m.id));
export function validEntry(key: string, value: unknown): boolean {
  if (tasks.has(key) || /^gate:m\d+$/.test(key) && modules.has(key.slice(5))) return typeof value === 'boolean';
  if (key.startsWith('note:') && modules.has(key.slice(5))) return typeof value === 'string' && value.length <= 20000;
  if (['career:apps','career:outreach','career:screens','career:mocks'].includes(key)) return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100000;
  if (['career:feedback','career:portfolio1','career:portfolio2','career:portfolio3'].includes(key)) return typeof value === 'string' && value.length <= 20000;
  if (key === 'pace') return [12,18,24].includes(Number(value)) && typeof value === 'number';
  if (key === 'startDate') return typeof value === 'string' && (value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (key === 'resume') return typeof value === 'string' && /^learn\/m(?:[0-9]|1[0-5])\/(?:read|watch|practice|gate)(?:\/\d+)?$/.test(value);
  return false;
}
export function normalizeImport(input: unknown): Stored {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a dashboard progress JSON file.');
  const raw = input as Record<string, unknown>;
  const result: Stored = {};
  if (raw.version === 2 && raw.values && typeof raw.values === 'object') Object.assign(result, raw.values);
  else if (raw.done && typeof raw.done === 'object') {
    Object.assign(result, raw.done);
    Object.entries((raw.notes || {}) as object).forEach(([k,v]) => result[`note:${k}`] = v);
    Object.entries((raw.career || {}) as object).forEach(([k,v]) => result[`career:${k}`] = v);
    if (raw.pace !== undefined) result.pace = Number(raw.pace);
    if (raw.startDate !== undefined) result.startDate = String(raw.startDate);
  } else throw new Error('This file is not a supported dashboard export.');
  if (!Object.keys(result).length || Object.entries(result).some(([k,v]) => !validEntry(k,v))) throw new Error('The progress file contains invalid values. No changes were made.');
  return result;
}
