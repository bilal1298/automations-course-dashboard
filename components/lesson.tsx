'use client';
import { useState } from 'react';
import { CheckCircle2, ListChecks, MessageSquare } from 'lucide-react';
import { lessons, PASS_MARK, type LessonSection, type Question } from '@/lib/lessons';
import { parse } from '@/lib/srs';
import { sectionDone } from '@/lib/progress';
import RichText from './rich-text';
import QuizRunner, { prepare, type Prepared } from './quiz';
import { useApp } from './app-context';

export type AnswerFn = (q: Question, correct: boolean) => void;

function SectionCheck({ questions }: { questions: Question[] }) {
  const { values, answer, loaded } = useApp();
  const [running, setRunning] = useState<Prepared[] | null>(null);
  const start = () => setRunning(prepare(questions));
  if (running) return <div className="section-check"><QuizRunner key={running.map(q => q.display.join()).join()} questions={running} onAnswer={answer} onRestart={start} onClose={() => setRunning(null)} /></div>;
  const done = sectionDone(values, questions);
  const right = questions.filter(q => (parse(values[`srs:${q.id}`])?.box ?? 0) > 0).length;
  return <div className={`section-check ${done ? 'done' : ''}`}>
    <div><b>{done ? <><CheckCircle2 size={17} /> Checked: {right} of {questions.length} right</> : `Check yourself: ${questions.length} quick questions`}</b>
    <p className="muted">{done ? 'Retake any time. Missed questions come back in Today.' : 'Answer these to finish this lesson.'}</p></div>
    <button className={done ? 'secondary' : 'primary'} disabled={!loaded} onClick={start}>{done ? 'Retake' : 'Start'}</button>
  </div>;
}

// One lesson of a rewritten module: plain explanation, example, interview phrasing, quick check.
export function SectionView({ section }: { section: LessonSection }) {
  return <article className="lesson-section">
    <RichText blocks={section.body} />
    {section.example && <figure><figcaption>{section.example.caption}</figcaption><pre><code>{section.example.code}</code></pre></figure>}
    <details className="interview-version"><summary><MessageSquare size={16} />How to say it in an interview</summary><p>“{section.interview}”</p></details>
    <SectionCheck questions={section.check} />
  </article>;
}

export function QuizPanel({ mid, onPassed }: { mid: string; onPassed: React.ReactNode }) {
  const { values, answer, change, loaded } = useApp();
  const lesson = lessons[mid];
  const [running, setRunning] = useState<Prepared[] | null>(null);
  const best = typeof values[`quiz:${mid}`] === 'number' ? Number(values[`quiz:${mid}`]) : null;
  const start = () => setRunning(prepare(lesson.quiz, true));
  const finish = (score: number) => { if (best === null || score > best) change(`quiz:${mid}`, score); };
  if (running) return <QuizRunner key={running.map(q => q.id).join()} questions={running} passMark={PASS_MARK} onAnswer={answer} onFinish={finish} onRestart={start} onClose={() => setRunning(null)} />;
  return <div className="quiz-intro">
    <span className="mastery-icon"><ListChecks size={30} /></span>
    <h2>Do you actually know this?</h2>
    <p>{lesson.quiz.length} real-world scenarios: reading logs, spotting bugs in code, deciding what to do when things break. Every answer is explained. Pass mark: {PASS_MARK}%.</p>
    <div className="quiz-best">{best === null ? 'Not taken yet' : <>Best score: <b className={best >= PASS_MARK ? 'pass' : ''}>{best}%</b>{best >= PASS_MARK ? ', passed' : `, need ${PASS_MARK}%`}</>}</div>
    <div className="button-row"><button className={best !== null && best >= PASS_MARK ? 'secondary' : 'primary'} disabled={!loaded} onClick={start}>{best === null ? 'Start quiz' : 'Retake quiz'}</button>{best !== null && best >= PASS_MARK && onPassed}</div>
  </div>;
}
