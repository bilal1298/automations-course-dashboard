import curriculum from './curriculum.json';
import { lessons, PASS_MARK, type Question } from './lessons';
import type { Stored } from './state';

export const modules = curriculum.modules;
export type Module = (typeof modules)[number];
export const clean = (title: string) => title.replace(/^\d+\. /, '');
export const moduleNumber = (m: Module) => modules.indexOf(m) + 1;
export const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s);

export const doneCount = (m: Module, v: Stored) => m.tasks.filter((_, i) => v[`${m.id}-${i}`] === true).length;
export const sectionDone = (v: Stored, questions: Question[]) => questions.every(q => v[`srs:${q.id}`] !== undefined);

// Each module is four steps: Learn → Quiz → Build → Prove. Quiz only exists for rewritten modules.
export function moduleProgress(m: Module, v: Stored) {
  const lesson = lessons[m.id];
  const learnTotal = lesson ? lesson.sections.length : 1;
  const learnDone = lesson ? lesson.sections.filter(s => sectionDone(v, s.check)).length : v[`read:${m.id}`] === true ? 1 : 0;
  const quizBest = typeof v[`quiz:${m.id}`] === 'number' ? Number(v[`quiz:${m.id}`]) : null;
  const quizPassed = !lesson || (quizBest ?? 0) >= PASS_MARK;
  const built = doneCount(m, v);
  const evidence = String(v[`evidence:${m.id}`] || '');
  const ready = built === m.tasks.length && quizPassed && isUrl(evidence);
  const mastered = ready && v[`gate:${m.id}`] === true;
  const started = learnDone > 0 || built > 0 || quizBest !== null;
  return {
    lesson, evidence, ready, mastered, started,
    learn: { done: learnDone, total: learnTotal, complete: learnDone === learnTotal },
    quiz: lesson ? { best: quizBest, passed: quizPassed, questions: lesson.quiz.length } : null,
    build: { done: built, total: m.tasks.length, complete: built === m.tasks.length },
  };
}

// The route for the next unfinished thing in a module.
export function nextStep(m: Module, v: Stored): { route: string; label: string } {
  const p = moduleProgress(m, v);
  if (!p.learn.complete) {
    const section = p.lesson ? p.lesson.sections.findIndex(s => !sectionDone(v, s.check)) : 0;
    return { route: `learn/${m.id}/learn/${section}`, label: p.lesson ? `Lesson ${section + 1}: ${p.lesson.sections[section].title}` : 'Read the lesson' };
  }
  if (p.quiz && !p.quiz.passed) return { route: `learn/${m.id}/quiz`, label: 'Take the quiz' };
  if (!p.build.complete) {
    const task = m.tasks.findIndex((_, i) => v[`${m.id}-${i}`] !== true);
    return { route: `learn/${m.id}/build/${task}`, label: `Exercise ${task + 1} of ${m.tasks.length}` };
  }
  if (!p.mastered) return { route: `learn/${m.id}/prove`, label: 'Pass the mastery check' };
  return { route: `learn/${m.id}`, label: 'Review this module' };
}

export const currentModule = (v: Stored) => modules.find(m => !moduleProgress(m, v).mastered) ?? modules[modules.length - 1];
