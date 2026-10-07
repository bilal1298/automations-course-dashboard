'use client';
import { useState } from 'react';
import { BookOpen, Brain, CheckCircle2, ChevronRight, Smartphone, Sparkles, Zap } from 'lucide-react';
import curriculum from '@/lib/curriculum.json';
import { allQuestions, lessons, type Question } from '@/lib/lessons';
import type { Stored } from '@/lib/state';
import { isDue, isMastered, parse } from '@/lib/srs';
import QuizRunner, { prepare, type Prepared } from './quiz';
import type { AnswerFn } from './lesson';
import { currentModule, learnState, modules, sectionDone } from '@/lib/progress';

const clean = (t: string) => t.replace(/^\d+\. /, '');

export default function Today({ values, answer, go, loaded }: { values: Stored; answer: AnswerFn; go: (path: string) => void; loaded: boolean }) {
  const [running, setRunning] = useState<{ title: string; questions: Prepared[] } | null>(null);
  const answered = Object.keys(values).filter(k => k.startsWith('srs:') && allQuestions[k.slice(4)]);
  const due = answered.filter(k => isDue(values[k])).map(k => allQuestions[k.slice(4)]);
  const mastered = answered.filter(k => isMastered(values[k])).length;
  const allSections = Object.values(lessons).flatMap(l => l.sections);
  const lessonsTotal = allSections.length;
  const lessonsDone = allSections.filter(s => sectionDone(values, s.check)).length;

  // The next unfinished lesson, starting from the module you're working on, then in course order.
  const focus = currentModule(values);
  const order = [focus, ...modules.filter(m => m !== focus)].filter(m => lessons[m.id] && !learnState(m, values).complete);
  const nextSection = order.flatMap(m => lessons[m.id].sections.map((s, i) => ({ mid: m.id, i, s }))).find(x => !sectionDone(values, x.s.check));
  // Quick practice: questions from lessons you've finished (and quizzes you've taken), missed ones first.
  const started = Object.entries(lessons).filter(([, l]) => l.sections.some(s => sectionDone(values, s.check)));
  const rank = (id: string) => { const s = parse(values[`srs:${id}`]); return !s ? 1 : s.box === 0 ? 0 : 1 + s.box; };
  const practicePool = started.flatMap(([mid, l]) => [...l.sections.filter(s => sectionDone(values, s.check)).flatMap(s => s.check), ...(values[`quiz:${mid}`] !== undefined ? l.quiz : [])])
    .sort((a, b) => rank(a.id) - rank(b.id));
  // Only suggest exercises from modules you've started reading, so day one isn't a wall of unfamiliar terms.
  const phoneTasks = started.flatMap(([mid, l]) => l.tasks.map((t, i) => ({ mid, i, t }))).filter(x => x.t.device === 'phone' && values[`${x.mid}-${x.i}`] !== true).slice(0, 3);

  const run = (title: string, questions: Question[]) => setRunning({ title, questions: prepare(questions, true) });

  if (running) return <main className="content narrow today">
    <p className="eyebrow">{running.title.toUpperCase()}</p>
    <QuizRunner key={running.questions.map(q => q.id).join()} questions={running.questions} onAnswer={answer} onClose={() => setRunning(null)} />
  </main>;

  return <main className="content narrow today">
    <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</p>
    <h1>Today</h1>
    <p className="page-subtitle">A 10-minute session you can do anywhere. Review, read one section, practise.</p>

    <section className={`today-card ${due.length ? 'highlight' : ''}`}>
      <span className="small-icon"><Brain size={20} /></span>
      <div><h2>Review</h2><p className="muted">{due.length ? `${due.length} question${due.length === 1 ? '' : 's'} due. Spaced review is what moves knowledge into long-term memory.` : answered.length ? 'Nothing due. Questions you miss come back tomorrow; ones you get right come back later.' : 'Answer your first questions and they’ll start appearing here on a schedule.'}</p></div>
      {due.length > 0 && <button className="primary" disabled={!loaded} onClick={() => run('Review', due.slice(0, 10))}>Start review{due.length > 10 ? ' (10)' : ''}</button>}
    </section>

    {nextSection && <section className="today-card">
      <span className="small-icon"><BookOpen size={20} /></span>
      <div><h2>Read next</h2><p><b>{nextSection.s.title}</b></p><p className="muted">{clean(curriculum.modules.find(m => m.id === nextSection.mid)!.title)} · section {nextSection.i + 1} · {nextSection.s.minutes} min + {nextSection.s.check.length} questions</p></div>
      <button className="primary" onClick={() => go(`learn/${nextSection.mid}/learn/${nextSection.i}`)}>Read</button>
    </section>}

    {practicePool.length > 0 && <section className="today-card">
      <span className="small-icon"><Zap size={20} /></span>
      <div><h2>Quick practice</h2><p className="muted">5 questions from lessons you’ve finished, the ones you missed first.</p></div>
      <button className="secondary" disabled={!loaded} onClick={() => run('Quick practice', practicePool.slice(0, 5))}>Practise</button>
    </section>}

    {phoneTasks.length > 0 && <section className="today-card column">
      <div className="row"><span className="small-icon"><Smartphone size={20} /></span><div><h2>Phone-friendly exercises</h2><p className="muted">Things you can finish without a computer.</p></div></div>
      {phoneTasks.map(x => <button key={`${x.mid}-${x.i}`} className="resource-row" onClick={() => go(`learn/${x.mid}/build/${x.i}`)}><span><Smartphone size={16} />{x.t.plain}</span><ChevronRight size={16} /></button>)}
    </section>}

    <div className="stats-strip today-stats">
      <div><Sparkles /><span><strong>{answered.length}</strong>Questions answered</span></div>
      <div><CheckCircle2 /><span><strong>{mastered}</strong>Remembered over time</span></div>
      <div><BookOpen /><span><strong>{lessonsDone} <em>/ {lessonsTotal}</em></strong>Lessons completed</span></div>
    </div>
  </main>;
}
