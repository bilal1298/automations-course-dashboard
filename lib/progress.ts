import curriculum from './curriculum.json';
import { lessons, PASS_MARK, type Question } from './lessons';
import type { Stored } from './state';
import { parse } from './srs';

export const modules = curriculum.modules;
export type Module = (typeof modules)[number];
export const clean = (title: string) => title.replace(/^\d+\. /, '');
export const moduleNumber = (m: Module) => modules.indexOf(m) + 1;
export const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s);

// A question counts once it has been answered correctly at least once (passed: is sticky; box > 0 covers older progress).
export const questionPassed = (v: Stored, q: Question) => v[`passed:${q.id}`] === true || (parse(v[`srs:${q.id}`])?.box ?? 0) > 0;
export const sectionDone = (v: Stored, questions: Question[]) => questions.every(q => questionPassed(v, q));
export const TEST_OUT = 90;

// Learn is done when every lesson check is passed, or when the module quiz is passed at TEST_OUT (skip what you know).
export function learnState(m: Module, v: Stored) {
  const lesson = lessons[m.id];
  const total = lesson ? lesson.sections.length : 1;
  const done = lesson ? lesson.sections.filter(s => sectionDone(v, s.check)).length : v[`read:${m.id}`] === true ? 1 : 0;
  const testedOut = typeof v[`quiz:${m.id}`] === 'number' && Number(v[`quiz:${m.id}`]) >= TEST_OUT;
  return { done, total, complete: done === total || testedOut, testedOut };
}

// "Learn …" exercises are covered by the lessons, so they tick themselves once Learn is complete.
export const autoTask = (m: Module, i: number, v: Stored) => m.tasks[i][0] === 'learn' && learnState(m, v).complete;
export const taskDone = (m: Module, i: number, v: Stored) => v[`${m.id}-${i}`] === true || autoTask(m, i, v);
export const doneCount = (m: Module, v: Stored) => m.tasks.filter((_, i) => taskDone(m, i, v)).length;

// Each module is four steps: Learn → Quiz → Build → Prove. Quiz only exists for rewritten modules.
export function moduleProgress(m: Module, v: Stored) {
  const lesson = lessons[m.id];
  const learn = learnState(m, v);
  const learnTotal = learn.total;
  const learnDone = learn.done;
  const quizBest = typeof v[`quiz:${m.id}`] === 'number' ? Number(v[`quiz:${m.id}`]) : null;
  const quizPassed = !lesson || (quizBest ?? 0) >= PASS_MARK;
  const built = doneCount(m, v);
  const evidence = String(v[`evidence:${m.id}`] || '').trim();
  const ready = learn.complete && built === m.tasks.length && quizPassed && isUrl(evidence);
  const mastered = ready && v[`gate:${m.id}`] === true;
  const started = learnDone > 0 || built > 0 || quizBest !== null;
  return {
    lesson, evidence, ready, mastered, started,
    learn: { done: learnDone, total: learnTotal, complete: learn.complete, testedOut: learn.testedOut },
    quiz: lesson ? { best: quizBest, passed: quizPassed, questions: lesson.quiz.length } : null,
    build: { done: built, total: m.tasks.length, complete: built === m.tasks.length },
  };
}

// The route for the next unfinished thing in a module.
export function nextStep(m: Module, v: Stored): { route: string; label: string } {
  const p = moduleProgress(m, v);
  if (p.mastered) return { route: `learn/${m.id}/learn/0`, label: 'Review this module' };
  if (!p.learn.complete) {
    const section = p.lesson ? Math.max(0, p.lesson.sections.findIndex(s => !sectionDone(v, s.check))) : 0;
    return { route: `learn/${m.id}/learn/${section}`, label: p.lesson ? `Lesson ${section + 1}: ${p.lesson.sections[section].title}` : 'Read the lesson' };
  }
  if (p.quiz && !p.quiz.passed) return { route: `learn/${m.id}/quiz`, label: 'Take the quiz' };
  if (!p.build.complete) {
    const task = m.tasks.findIndex((_, i) => !taskDone(m, i, v));
    return { route: `learn/${m.id}/build/${task}`, label: `Exercise ${task + 1} of ${m.tasks.length}` };
  }
  if (!p.mastered) return { route: `learn/${m.id}/prove`, label: 'Pass the mastery check' };
  return { route: `learn/${m.id}/learn/0`, label: 'Review this module' };
}

// The module you were last in, unless it's mastered; otherwise the first unmastered one in course order.
export function currentModule(v: Stored) {
  const recent = modules.find(m => m.id === String(v.resume || '').split('/')[1]);
  if (recent && !moduleProgress(recent, v).mastered) return recent;
  return modules.find(m => !moduleProgress(m, v).mastered) ?? modules[modules.length - 1];
}
