// Spaced review (Leitner boxes). Stored per question as "box|YYYY-MM-DD" (the date it is next due).
const intervals = [1, 3, 7, 16, 35];

export const today = () => toDay(new Date());
const toDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function parse(value: unknown): { box: number; due: string } | null {
  if (typeof value !== 'string') return null;
  const [box, due] = value.split('|');
  return { box: Number(box), due };
}

export function schedule(previous: unknown, correct: boolean): string {
  // Re-answering early doesn't count as remembering over time: keep the schedule until it's due.
  if (correct && parse(previous) && !isDue(previous)) return String(previous);
  // Box 0 = answered wrong last time. Each correct answer moves the question up a box and pushes it further out.
  const box = correct ? Math.min((parse(previous)?.box ?? 0) + 1, intervals.length - 1) : 0;
  const due = new Date();
  due.setDate(due.getDate() + intervals[box]);
  return `${box}|${toDay(due)}`;
}

export const isDue = (value: unknown) => { const s = parse(value); return !!s && s.due <= today(); };
export const isMastered = (value: unknown) => (parse(value)?.box ?? 0) >= 2;
