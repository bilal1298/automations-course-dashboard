'use client';
import { useState } from 'react';
import { Check, X, RotateCcw, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Question } from '@/lib/lessons';
import { Inline } from './rich-text';
import { useApp } from './app-context';
import { clean, modules } from '@/lib/progress';

// A question plus the shuffled order its options/items are displayed in.
export type Prepared = Question & { display: number[] };

const shuffle = <T,>(items: T[]) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Call from an event handler (not during render): shuffles options, and optionally question order.
export function prepare(questions: Question[], shuffleQuestions = false): Prepared[] {
  return (shuffleQuestions ? shuffle(questions) : questions).map(q => {
    const n = q.kind === 'choice' ? q.options.length : q.items.length;
    return { ...q, display: shuffle([...Array(n).keys()]) };
  });
}

function ChoiceView({ q, onAnswer }: { q: Prepared & { kind: 'choice' }; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  return <div className="options">
    {q.display.map(i => {
      const state = !answered ? '' : i === q.answer ? 'correct' : i === picked ? 'wrong' : 'faded';
      return <button key={i} className={`option ${state}`} disabled={answered} onClick={() => { setPicked(i); onAnswer(i === q.answer); }}>
        <span className="option-mark">{state === 'correct' ? <Check size={16} /> : state === 'wrong' ? <X size={16} /> : null}</span>
        <span><Inline text={q.options[i].text} />{answered && (i === picked || i === q.answer) && <small><Inline text={q.options[i].why} /></small>}</span>
      </button>;
    })}
  </div>;
}

function OrderView({ q, onAnswer }: { q: Prepared & { kind: 'order' }; onAnswer: (correct: boolean) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const remaining = q.display.filter(i => !sequence.includes(i));
  const check = () => { setChecked(true); onAnswer(sequence.every((item, position) => item === position)); };
  return <div className="order">
    <ol className="order-chosen">
      {sequence.map((item, position) => <li key={item} className={checked ? (item === position ? 'correct' : 'wrong') : ''}>
        <span>{position + 1}.</span><button disabled={checked} onClick={() => setSequence(sequence.filter(x => x !== item))}><Inline text={q.items[item]} /></button>
      </li>)}
    </ol>
    {remaining.length > 0 && <><p className="muted order-hint">{sequence.length ? 'Tap the next step:' : 'Tap the steps in order. Tap a chosen step to undo.'}</p>
      <div className="options">{remaining.map(i => <button key={i} className="option" onClick={() => setSequence([...sequence, i])}><span><Inline text={q.items[i]} /></span></button>)}</div></>}
    {!checked && remaining.length === 0 && <button className="primary" onClick={check}>Check order</button>}
    {checked && sequence.some((item, position) => item !== position) && <div className="correct-order"><b>Correct order</b><ol>{q.items.map(item => <li key={item}><Inline text={item} /></li>)}</ol></div>}
  </div>;
}

export function QuestionCard({ q, onAnswer }: { q: Prepared; onAnswer: (correct: boolean) => void }) {
  const [result, setResult] = useState<boolean | null>(null);
  const answer = (correct: boolean) => { setResult(correct); onAnswer(correct); };
  return <div className="quiz-question">
    <h3><Inline text={q.prompt} /></h3>
    {q.code && <pre><code>{q.code}</code></pre>}
    {q.kind === 'choice' ? <ChoiceView q={q} onAnswer={answer} /> : <OrderView q={q} onAnswer={answer} />}
    {result !== null && <div className={`explain ${result ? 'is-correct' : 'is-wrong'}`}><b>{result ? 'Correct' : 'Not quite'}</b><p><Inline text={q.explain} /></p></div>}
  </div>;
}

// Where a question is taught: lesson checks (mX-sN-K) map to lesson N; quiz questions (mX-qK) to the module's lessons.
export function locate(id: string): { route: string; label: string } | null {
  const lesson = id.match(/^(m\d+)-s(\d+)-\d+$/);
  if (lesson) return { route: `learn/${lesson[1]}/learn/${lesson[2]}`, label: `${moduleName(lesson[1])}, lesson ${Number(lesson[2]) + 1}` };
  const quiz = id.match(/^(m\d+)-q\d+$/);
  return quiz ? { route: `learn/${quiz[1]}/learn/0`, label: `${moduleName(quiz[1])} lessons` } : null;
}
const moduleName = (mid: string) => clean(modules.find(m => m.id === mid)?.title ?? mid).split(/[:,(]/)[0].trim();

export default function QuizRunner({ questions, onAnswer, onFinish, onRestart, onClose, passMark, previousBest }: {
  questions: Prepared[];
  onAnswer: (q: Question, correct: boolean) => void;
  onFinish?: (score: number) => void;
  onRestart?: () => void;
  onClose: () => void;
  passMark?: number;
  previousBest?: number | null;
}) {
  const { go } = useApp();
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const q = questions[index];
  const correct = Object.values(results).filter(Boolean).length;
  const finished = index >= questions.length;
  const score = Math.round(correct / questions.length * 100);
  const next = () => { if (index === questions.length - 1) onFinish?.(score); setIndex(index + 1); };

  if (finished) {
    const missed = questions.filter(x => results[x.id] === false);
    const passed = passMark === undefined || score >= passMark;
    return <div className="quiz-summary">
      <span className={`summary-score ${passed ? 'pass' : ''}`}>{passed && passMark !== undefined && <Trophy size={20} />}{score}%</span>
      <h3>{correct} of {questions.length} correct</h3>
      <p className="muted">{passMark === undefined ? 'Missed questions come back in your Today review.' : passed ? 'You passed. Missed questions still come back in your Today review.' : previousBest != null && previousBest >= passMark ? `Below your best of ${previousBest}%, which still counts. Missed questions come back in Today.` : `You need ${passMark}% to pass. Re-read the lessons behind the questions you missed, then retake.`}</p>
      {missed.length > 0 && <div className="missed"><b>To revisit</b><ul>{missed.map(x => { const where = locate(x.id); return <li key={x.id}><Inline text={x.prompt} />{where && <button className="text-button revisit" onClick={() => go(where.route)}>{where.label} →</button>}</li>; })}</ul></div>}
      <div className="button-row">{onRestart && <button className="secondary" onClick={onRestart}><RotateCcw size={16} />Try again</button>}<button className="primary" onClick={onClose}>Done</button></div>
    </div>;
  }

  return <div className="quiz-runner">
    <div className="quiz-progress"><span>Question {index + 1} of {questions.length}</span><button className="text-button" onClick={onClose}>Exit</button></div>
    <Progress value={index / questions.length * 100} />
    <QuestionCard key={q.id} q={q} onAnswer={c => { setResults(r => ({ ...r, [q.id]: c })); onAnswer(q, c); }} />
    {q.id in results && <button className="primary next-question" onClick={next}>{index === questions.length - 1 ? 'See results' : 'Next question'}</button>}
  </div>;
}
