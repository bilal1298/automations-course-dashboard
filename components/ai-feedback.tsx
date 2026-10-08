'use client';
import { useState } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';
import { useApp } from './app-context';

// Asks /api/feedback for written coaching. Only rendered when the server has an Anthropic API key.
export default function AiFeedback({ kind, question, guide, placeholder, label }: {
  kind: 'interview' | 'cv'; question?: string; guide?: string; placeholder: string; label: string;
}) {
  const { aiEnabled } = useApp();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  if (!aiEnabled) return null;

  const ask = async () => {
    setBusy(true); setError(''); setResult('');
    try {
      const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, text, question, guide }) });
      const data = await res.json() as { feedback?: string; error?: string };
      if (!res.ok || !data.feedback) throw new Error(data.error);
      setResult(data.feedback);
    } catch (e) { setError(e instanceof Error && e.message ? e.message : 'Couldn’t get feedback. Check your connection.'); }
    setBusy(false);
  };

  return <div className="ai-feedback">
    <label className="field-label" htmlFor={`ai-${kind}`}>{label}</label>
    <textarea id={`ai-${kind}`} rows={5} maxLength={4000} value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} />
    <button className="secondary" disabled={busy || text.trim().length < 10} onClick={ask}>{busy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}{busy ? 'Thinking…' : 'Get AI feedback'}</button>
    {error && <p className="field-hint">{error}</p>}
    {result && <div className="ai-result">{result}</div>}
  </div>;
}
