'use client';
import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { interviewQuestions, type InterviewQuestion } from '@/lib/interview-bank';
import { today } from '@/lib/srs';
import { useApp } from './app-context';

const ANSWER_SECONDS = 180;
const rubric = ['Missed it', 'Vague', 'OK', 'Good', 'Strong'];

// Five questions from different categories, timed, then self-scored against the answer guide.
function pickFive(): InterviewQuestion[] {
  const shuffled = [...interviewQuestions].sort(() => Math.random() - 0.5);
  const picked: InterviewQuestion[] = [];
  for (const q of shuffled) if (picked.length < 5 && !picked.some(p => p[0] === q[0])) picked.push(q);
  for (const q of shuffled) if (picked.length < 5 && !picked.includes(q)) picked.push(q);
  return picked;
}

export default function MockInterview() {
  const { values, change, loaded } = useApp();
  const [questions, setQuestions] = useState<InterviewQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(ANSWER_SECONDS);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<number[]>([]);

  useEffect(() => {
    if (!questions || revealed || index >= questions.length) return;
    const id = setInterval(() => setLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [questions, revealed, index]);

  const start = () => { setQuestions(pickFive()); setIndex(0); setLeft(ANSWER_SECONDS); setRevealed(false); setScores([]); };
  const score = (n: number) => { setScores([...scores, n]); setIndex(index + 1); setLeft(ANSWER_SECONDS); setRevealed(false); };

  if (!questions) return <div className="question-card mock-intro">
    <h2>Mock interview</h2>
    <p className="muted">Five questions from different topics. Answer each out loud in under 3 minutes (record yourself on your phone if you can), then compare with the answer guide and score yourself honestly.</p>
    <button className="primary" onClick={start}><Timer size={17} />Start a mock</button>
  </div>;

  if (index >= questions.length) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const weak = questions.filter((_, i) => scores[i] <= 2);
    const saveToLog = () => {
      const lines = questions.map((q, i) => `${today()} · ${q[0]} · ${scores[i]}/5 · ${q[1]}`).join('\n');
      const log = String(values['career:interviewLog'] || '');
      change('career:interviewLog', (lines + (log ? '\n' + log : '')).slice(0, 20000));
    };
    return <div className="question-card">
      <span className="summary-score">{avg.toFixed(1)}<small>/5</small></span>
      <h3>Mock complete</h3>
      {weak.length > 0 ? <div className="missed"><b>Practise these again</b><ul>{weak.map(q => <li key={q[1]}><b>{q[0]}:</b> {q[1]}</li>)}</ul></div> : <p className="muted">No weak answers this round. Try again tomorrow with new questions.</p>}
      <div className="button-row"><button className="primary" disabled={!loaded} onClick={() => { saveToLog(); setQuestions(null); }}>Save to my log</button><button className="secondary" onClick={start}>Another mock</button></div>
    </div>;
  }

  const q = questions[index];
  return <div className="question-card">
    <div className="mock-head"><span className="chip">{q[0]}</span><span>Question {index + 1} of 5</span><span className={`mock-timer ${left === 0 ? 'over' : ''}`}><Timer size={15} />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></div>
    <h2>{q[1]}</h2>
    {!revealed ? <button className="primary" onClick={() => setRevealed(true)}>I’ve answered: show the guide</button> : <>
      <div className="answer"><h3>A strong answer covers</h3><p>{q[2]}</p></div>
      <p className="muted mock-rate">How did you do?</p>
      <div className="score-row">{rubric.map((label, i) => <button key={label} className="secondary" onClick={() => score(i + 1)}><b>{i + 1}</b><small>{label}</small></button>)}</div>
    </>}
  </div>;
}
