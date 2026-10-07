// Structural checks for lesson files: run with `pnpm check:lessons`.
import curriculum from '../lib/curriculum.json';
import { glossary } from '../lib/glossary';
import { lessons as registered } from '../lib/lessons';
import type { Lesson } from '../lib/lessons';

// Also check unregistered files passed as arguments, e.g. `pnpm check:lessons m3 m4`.
const extra = await Promise.all(process.argv.slice(2).map(async id => [id, (await import(`../lib/lessons/${id}.ts`))[id] as Lesson] as const));
const lessons: Record<string, Lesson> = { ...registered, ...Object.fromEntries(extra) };
const problems: string[] = [];

const ids = new Set<string>();
const allTerms = { ...glossary, ...Object.assign({}, ...Object.values(lessons).map(l => l.glossary ?? {})) };

for (const [mid, lesson] of Object.entries(lessons)) {
  const m = curriculum.modules.find(x => x.id === mid);
  if (!m) { problems.push(`${mid}: not in curriculum`); continue; }
  if (lesson.tasks.length !== m.tasks.length) problems.push(`${mid}: ${lesson.tasks.length} task overrides, curriculum has ${m.tasks.length}`);
  for (const k of Object.keys(lesson.glossary ?? {})) if (k !== k.toLowerCase()) problems.push(`${mid}: glossary key not lowercase: ${k}`);
  const text: string[] = [lesson.intro];
  const questions = [...lesson.sections.flatMap((s, i) => s.check.map(q => ({ q, where: `lesson ${i + 1}` }))), ...lesson.quiz.map(q => ({ q, where: 'quiz' }))];
  lesson.sections.forEach((s, i) => {
    text.push(...s.body, s.interview);
    if (s.check.length < 2 || s.check.length > 3) problems.push(`${mid} lesson ${i + 1}: ${s.check.length} check questions (want 2–3)`);
    const words = s.body.join(' ').split(/\s+/).length;
    if (words > 450) problems.push(`${mid} lesson ${i + 1}: ${words} words (keep under 450)`);
  });
  if (lesson.quiz.length < 10 || lesson.quiz.length > 15) problems.push(`${mid}: quiz has ${lesson.quiz.length} questions (want 10–15)`);
  for (const { q, where } of questions) {
    if (ids.has(q.id)) problems.push(`duplicate question id ${q.id}`);
    ids.add(q.id);
    if (!q.id.startsWith(mid + '-')) problems.push(`${q.id} (${where}): id must start with ${mid}-`);
    text.push(q.prompt, q.explain);
    if (q.kind === 'choice') {
      if (q.options.length !== 4) problems.push(`${q.id}: ${q.options.length} options (want 4)`);
      if (q.answer < 0 || q.answer >= q.options.length) problems.push(`${q.id}: answer index out of range`);
      q.options.forEach(o => text.push(o.text, o.why));
    } else if (q.items.length < 3) problems.push(`${q.id}: order question needs 3+ items`);
  }
  for (const t of text) {
    for (const [, term] of t.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) if (!allTerms[term.toLowerCase()]) problems.push(`${mid}: no glossary entry for [[${term}]]`);
    if ((t.match(/\*\*/g) ?? []).length % 2) problems.push(`${mid}: unbalanced ** in: ${t.slice(0, 60)}…`);
  }
}
console.log(problems.length ? problems.join('\n') : `OK: ${Object.keys(lessons).length} modules, ${ids.size} questions`);
process.exit(problems.length ? 1 : 0);
