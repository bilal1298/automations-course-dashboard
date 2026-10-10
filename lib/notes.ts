// Quick notes taken while learning. Stored as one JSON string under `notes:items`.
export const noteTypes = {
  note: { label: 'Note', plural: 'Notes', hint: 'Something to remember' },
  question: { label: 'Question', plural: 'Questions', hint: 'Something to look into' },
  todo: { label: 'To-do', plural: 'To-dos', hint: 'Something to do' },
} as const;
export type NoteType = keyof typeof noteTypes;

export type QuickNote = {
  id: string;
  type: NoteType;
  text: string;
  created: string; // ISO date-time
  done: boolean; // to-do done / question answered
  module?: string; // module id it was written in
  route?: string; // the page it was written on, to jump back
  where?: string; // human-readable place, e.g. "SQL module · Lesson 3: Transactions"
};

export function parseNotes(value: unknown): QuickNote[] {
  if (typeof value !== 'string' || !value) return [];
  try { const list = JSON.parse(value); return Array.isArray(list) ? list : []; } catch { return []; }
}

export function validNotes(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 400000) return false;
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) && list.length <= 1000 && list.every(n => n && typeof n === 'object'
      && typeof n.id === 'string' && n.type in noteTypes && typeof n.text === 'string' && n.text.length <= 4000
      && typeof n.created === 'string' && typeof n.done === 'boolean'
      && ['module', 'route', 'where'].every(k => n[k] === undefined || (typeof n[k] === 'string' && n[k].length <= 300)));
  } catch { return false; }
}
