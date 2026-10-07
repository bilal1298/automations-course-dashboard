'use client';
import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, Clock3, ListChecks, MessageSquare } from 'lucide-react';
import { lessons, PASS_MARK, type Lesson, type Question } from '@/lib/lessons';
import type { Stored } from '@/lib/state';
import { parse } from '@/lib/srs';
import RichText from './rich-text';
import QuizRunner, { prepare, type Prepared } from './quiz';

export type AnswerFn = (q: Question, correct: boolean) => void;

export const sectionDone = (values: Stored, questions: Question[]) => questions.every(q => values[`srs:${q.id}`] !== undefined);

function SectionCheck({ questions, values, answer, loaded }: { questions: Question[]; values: Stored; answer: AnswerFn; loaded: boolean }) {
  const [running, setRunning] = useState<Prepared[] | null>(null);
  const start = () => setRunning(prepare(questions));
  if (running) return <div className="section-check"><QuizRunner key={running.map(q => q.display.join()).join()} questions={running} onAnswer={answer} onRestart={start} onClose={() => setRunning(null)} /></div>;
  const done = sectionDone(values, questions);
  const right = questions.filter(q => (parse(values[`srs:${q.id}`])?.box ?? 0) > 0).length;
  return <div className="section-check">
    <div><b>{done ? <><CheckCircle2 size={17} /> Checked: {right} of {questions.length} right last time</> : `Check yourself: ${questions.length} quick questions`}</b>
    <p className="muted">{done ? 'Retake any time. Missed questions also come back in Today.' : 'Answer before moving on. It’s the fastest way to make this stick.'}</p></div>
    <button className={done ? 'secondary' : 'primary'} disabled={!loaded} onClick={start}>{done ? 'Retake' : 'Start'}</button>
  </div>;
}

export function LessonView({ lesson, values, answer, loaded, focus, why, footer }: {
  lesson: Lesson; values: Stored; answer: AnswerFn; loaded: boolean; focus: number | null; why: string; footer: React.ReactNode;
}) {
  useEffect(() => { if (focus !== null) document.getElementById(`section-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [focus]);
  const minutes = lesson.sections.reduce((n, s) => n + s.minutes, 0);
  return <article className="reading lesson-v2">
    <div className="reading-intro"><span className="small-icon"><BookOpen size={20} /></span><div><h2>Why this matters</h2><p>{lesson.intro}</p><p className="muted lesson-stats"><Clock3 size={14} />{minutes} min read · {lesson.sections.length} sections · tap <span className="term">underlined words</span> for a definition</p></div></div>
    {lesson.sections.map((section, i) => <section className="lesson-section" id={`section-${i}`} key={section.title}>
      <span className="chapter-number">{String(i + 1).padStart(2, '0')} · {section.minutes} min</span>
      <h3>{section.title}</h3>
      <RichText blocks={section.body} />
      {section.example && <figure><figcaption>{section.example.caption}</figcaption><pre><code>{section.example.code}</code></pre></figure>}
      <details className="interview-version"><summary><MessageSquare size={16} />How to say it in an interview</summary><p>“{section.interview}”</p></details>
      <SectionCheck questions={section.check} values={values} answer={answer} loaded={loaded} />
    </section>)}
    <div className="reading-intro"><div><h2>The original brief</h2><p>{why}</p></div></div>
    {footer}
  </article>;
}

export function QuizPanel({ mid, values, answer, change, loaded }: {
  mid: string; values: Stored; answer: AnswerFn; change: (k: string, v: number) => void; loaded: boolean;
}) {
  const lesson = lessons[mid];
  const [running, setRunning] = useState<Prepared[] | null>(null);
  const best = Number(values[`quiz:${mid}`] ?? -1);
  const start = () => setRunning(prepare(lesson.quiz, true));
  const finish = (score: number) => { if (score > best) change(`quiz:${mid}`, score); };
  if (running) return <div className="quiz-area"><QuizRunner key={running.map(q => q.id).join()} questions={running} passMark={PASS_MARK} onAnswer={answer} onFinish={finish} onRestart={start} onClose={() => setRunning(null)} /></div>;
  return <div className="quiz-area quiz-intro">
    <span className="mastery-icon"><ListChecks size={30} /></span>
    <span className="eyebrow">MODULE QUIZ</span>
    <h2>Do you actually know this?</h2>
    <p>{lesson.quiz.length} scenario questions: reading logs, spotting bugs in code, and choosing what to do when things break. Every answer is explained. You need {PASS_MARK}% to pass the mastery check.</p>
    <div className="quiz-best">{best < 0 ? 'Not attempted yet' : <>Best score: <b className={best >= PASS_MARK ? 'pass' : ''}>{best}%</b>{best >= PASS_MARK ? ' (passed)' : ` (need ${PASS_MARK}%)`}</>}</div>
    <button className="primary" disabled={!loaded} onClick={start}>{best < 0 ? 'Start quiz' : 'Retake quiz'}</button>
  </div>;
}
