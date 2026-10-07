'use client';
import { useState } from 'react';
import { BookOpen, Brain, CheckCircle2, Laptop, Smartphone, Sparkles, Zap } from 'lucide-react';
import curriculum from '@/lib/curriculum.json';
import { allQuestions, lessons, type Question } from '@/lib/lessons';
import type { Stored } from '@/lib/state';
import { isDue, isMastered, parse } from '@/lib/srs';
import QuizRunner, { prepare, type Prepared } from './quiz';
import { sectionDone, type AnswerFn } from './lesson';

const clean = (t: string) => t.replace(/^\d+\. /, '');

export default function Today({ values, answer, go, loaded }: { values: Stored; answer: AnswerFn; go: (path: string) => void; loaded: boolean }) {
  const [running, setRunning] = useState<{ title: string; questions: Prepared[] } | null>(null);
  const answered = Object.keys(values).filter(k => k.startsWith('srs:') && allQuestions[k.slice(4)]);
  const due = answered.filter(k => isDue(values[k])).map(k => allQuestions[k.slice(4)]);
  const mastered = answered.filter(k => isMastered(values[k])).length;

  // The next lesson section whose check hasn't been done yet.
  const nextSection = Object.entries(lessons).flatMap(([mid, lesson]) => lesson.sections.map((s, i) => ({ mid, i, s }))).find(x => !sectionDone(values, x.s.check));
  // Quick practice: unanswered or weakest questions first, from modules you've started reading.
  const started = Object.entries(lessons).filter(([, l]) => l.sections.some(s => sectionDone(values, s.check)));
  const practicePool = started.flatMap(([, l]) => [...l.sections.flatMap(s => s.check), ...l.quiz])
    .sort((a, b) => (parse(values[`srs:${a.id}`])?.box ?? -1) - (parse(values[`srs:${b.id}`])?.box ?? -1));
  const phoneTasks = Object.entries(lessons).flatMap(([mid, l]) => l.tasks.map((t, i) => ({ mid, i, t }))).filter(x => x.t.device === 'phone' && values[`${x.mid}-${x.i}`] !== true).slice(0, 3);

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
      <button className="primary" onClick={() => go(`learn/${nextSection.mid}/read/${nextSection.i}`)}>Read</button>
    </section>}

    {practicePool.length > 0 && <section className="today-card">
      <span className="small-icon"><Zap size={20} /></span>
      <div><h2>Quick practice</h2><p className="muted">5 questions from what you’ve started, weakest first.</p></div>
      <button className="secondary" disabled={!loaded} onClick={() => run('Quick practice', practicePool.slice(0, 5))}>Practise</button>
    </section>}

    {phoneTasks.length > 0 && <section className="today-card column">
      <div className="row"><span className="small-icon"><Smartphone size={20} /></span><div><h2>Phone-friendly exercises</h2><p className="muted">Things you can finish without a computer.</p></div></div>
      {phoneTasks.map(x => <button key={`${x.mid}-${x.i}`} className="resource-row" onClick={() => go(`learn/${x.mid}/practice/${x.i}`)}><span><Smartphone size={16} />{x.t.plain}</span></button>)}
    </section>}

    <div className="stats-strip today-stats">
      <div><Sparkles /><span><strong>{answered.length}</strong>Questions answered</span></div>
      <div><CheckCircle2 /><span><strong>{mastered}</strong>Remembered over time</span></div>
      <div><Laptop /><span><strong>{Object.keys(lessons).length} <em>/ 16</em></strong>Modules with quizzes</span></div>
    </div>
  </main>;
}
