'use client';
import { useRef, useState } from 'react';
import { BriefcaseBusiness, Download, ExternalLink, GraduationCap, KeyRound, MessageSquare, Target, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import curriculum from '@/lib/curriculum.json';
import { clean, modules } from '@/lib/progress';
import { normalizeImport, type Stored } from '@/lib/state';
import { createClient } from '@/lib/supabase/client';
import { useApp } from './app-context';
import Applications from './applications';
import MockInterview from './mock-interview';
import { interviewCategories, interviewQuestions } from '@/lib/interview-bank';

export function InterviewPage() {
  const { values, change, loaded } = useApp();
  const [filter, setFilter] = useState('All topics');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<'practise' | 'mock'>('practise');
  const questions = interviewQuestions.filter(q => filter === 'All topics' || q[0] === filter);
  const q = questions[index % questions.length];
  const move = (by: number) => { setIndex(i => i + by); setRevealed(false); };
  return <main className="content narrow">
    <p className="eyebrow">PRACTISE OUT LOUD</p>
    <h1>Interview practice</h1>
    <p className="page-subtitle">Answer out loud first, then compare with what a strong answer covers. {interviewQuestions.length} questions across {interviewCategories.length} topics.</p>
    <div className="segmented" role="tablist"><button role="tab" aria-selected={mode === 'practise'} className={mode === 'practise' ? 'on' : ''} onClick={() => setMode('practise')}>Practise by topic</button><button role="tab" aria-selected={mode === 'mock'} className={mode === 'mock' ? 'on' : ''} onClick={() => setMode('mock')}>Mock interview</button></div>
    {mode === 'mock' ? <MockInterview /> : <>
    <div className="interview-filter">
      <Select value={filter} onValueChange={v => { setFilter(v); setIndex(0); setRevealed(false); }}>
        <SelectTrigger aria-label="Interview topic"><SelectValue /></SelectTrigger>
        <SelectContent>{['All topics', ...interviewCategories].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
      </Select>
      <span>{index % questions.length + 1} of {questions.length}</span>
    </div>
    <div className="question-card">
      <span className="chip">{q[0]}</span>
      <h2>{q[1]}</h2>
      <p className="muted">Take 2–3 minutes. Clarify assumptions and talk about what could fail.</p>
      {revealed ? <div className="answer"><h3>A strong answer covers</h3><p>{q[2]}</p></div> : <button className="primary" onClick={() => setRevealed(true)}>Show answer guide</button>}
      <div className="next-bar"><button className="secondary" disabled={index === 0} onClick={() => move(-1)}>Previous</button><button className="secondary" onClick={() => move(1)}>Next question</button></div>
    </div></>}
    <section className="surface">
      <h3>My interview log</h3>
      <p className="muted">What did you miss? Which module will you revisit?</p>
      <textarea aria-label="Interview log" disabled={!loaded} maxLength={20000} rows={6} value={String(values['career:interviewLog'] || '')} onChange={e => change('career:interviewLog', e.target.value)} placeholder="Question → gap in my answer → module to revisit → retest date" />
    </section>
    <section className="surface">
      <h3>Skills employers ask about</h3>
      <div className="skills-table">{curriculum.market_skills.map(s => <div key={s[0]}><b>{s[0]}</b><p>{s[1]}</p></div>)}</div>
    </section>
  </main>;
}

// Portfolio projects in the order they're built; storage keys predate the case study, hence portfolio4 first.
const portfolio = [['m17', 'portfolio4'], ['m11', 'portfolio1'], ['m12', 'portfolio2'], ['m13', 'portfolio3']];

export function CareerPage() {
  const { values, change, loaded, go } = useApp();
  const metrics: [string, string, typeof BriefcaseBusiness][] = [['outreach', 'Outreach messages sent', MessageSquare], ['mocks', 'Mock interviews done', GraduationCap]];
  return <main className="content narrow">
    <p className="eyebrow">LEARN AND APPLY AT THE SAME TIME</p>
    <h1>Career tracker</h1>
    <p className="page-subtitle">Log every application, follow up, and let what interviewers ask decide what you study next.</p>
    <div className="career-metrics">{metrics.map(([id, label, Icon]) => <label className="metric-edit" key={id}><Icon size={22} /><span>{label}</span>
      <input type="number" inputMode="numeric" min={0} max={100000} disabled={!loaded} aria-label={label} value={Number(values[`career:${id}`]) || 0} onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 0 && n <= 100000) change(`career:${id}`, n); }} />
    </label>)}</div>
    <Applications />
    <section className="surface">
      <h2>Your portfolio</h2>
      <p className="muted">Link each capstone’s repository or demo.</p>
      {portfolio.map(([mid, key], i) => { const m = modules.find(x => x.id === mid)!; return <div className="portfolio-field" key={m.id}>
        <label htmlFor={key}><span>0{i + 1}</span>{clean(m.title).replace(/^(Capstone #\d — |Portfolio Project: )/, '')}</label>
        <input id={key} disabled={!loaded} type="url" maxLength={20000} value={String(values[`career:${key}`] || '')} onChange={e => change(`career:${key}`, e.target.value)} placeholder="https://github.com/…" />
        <button className="text-button" onClick={() => go(`learn/${m.id}`)}>Open project brief</button>
      </div>; })}
    </section>
    <section className="surface">
      <div className="row"><span className="small-icon"><Target size={20} /></span><h2>A weekly rhythm</h2></div>
      <p className="muted">Suggested targets, not quotas. Prioritise roles where you can show relevant evidence.</p>
      <div className="weekly-item"><strong>10</strong><span>Tailored applications</span></div>
      <div className="weekly-item"><strong>10</strong><span>Short, specific outreach messages</span></div>
      <div className="weekly-item"><strong>1</strong><span>Mock interview with a failure log</span></div>
    </section>
    <section className="surface">
      <h3>Application feedback</h3>
      <textarea aria-label="Application feedback" disabled={!loaded} maxLength={20000} rows={6} value={String(values['career:feedback'] || '')} onChange={e => change('career:feedback', e.target.value)} placeholder="Company / role, result, what I learned, next action" />
    </section>
    <p className="bottom-note">A roadmap builds capability and evidence. Hiring outcomes also depend on fit, applications, interviews and the market.</p>
  </main>;
}

export function SettingsPage({ email, exportProgress, onImport }: { email: string; exportProgress: () => void; onImport: (data: Stored) => void }) {
  const { values, change, loaded } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const pace = Number(values.pace) || 18;
  const totalHours = modules.reduce((n, m) => n + m.hours, 0);
  const updatePassword = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await createClient().auth.updateUser({ password }); setMessage(error ? error.message : 'Password updated.'); if (!error) setPassword(''); };
  const readImport = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 500000) throw new Error('Choose a progress file smaller than 500 KB.');
      let data: unknown;
      try { data = JSON.parse(await file.text()); } catch { throw new Error('That isn’t a valid progress file. Choose the .json file you exported.'); }
      onImport(normalizeImport(data)); setImportMessage('');
    }
    catch (e) { setImportMessage(e instanceof Error ? e.message : 'That isn’t a valid progress file.'); }
    if (input.current) input.current.value = '';
  };
  return <main className="content narrow">
    <h1>Settings</h1>
    {message && <p className="login-message" role="status">{message}</p>}
    <section className="surface">
      <h2>Study plan</h2>
      <div className="settings-row"><label id="pace-label">Weekly study time</label>
        <Select disabled={!loaded} value={String(pace)} onValueChange={v => change('pace', Number(v))}><SelectTrigger aria-labelledby="pace-label"><SelectValue /></SelectTrigger><SelectContent>{[12, 18, 24].map(p => <SelectItem value={String(p)} key={p}>{p} hours / week</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="settings-row"><label htmlFor="start-date">Start date</label><input id="start-date" disabled={!loaded} type="date" value={String(values.startDate || '')} onChange={e => change('startDate', e.target.value)} /></div>
      <p className="muted">The full course is about {totalHours} hours. Your estimate shrinks as you finish exercises.</p>
    </section>
    <section className="surface">
      <h2>Backups</h2>
      <p className="muted">Everything saves to your account automatically. Export a copy any time, or import one.</p>
      <div className="button-row"><button className="primary" disabled={!loaded} onClick={exportProgress}><Download size={17} />Export progress</button><button className="secondary" disabled={!loaded} onClick={() => input.current?.click()}><Upload size={17} />Import progress</button></div>
      {importMessage && <p className="login-message import-message" role="alert">{importMessage}</p>}
      <input hidden ref={input} type="file" accept="application/json,.json" onChange={e => readImport(e.target.files?.[0])} />
    </section>
    <section className="surface">
      <h2>Account</h2>
      <p className="muted">Signed in as {email}.</p>
      <form className="password-form" onSubmit={updatePassword}>
        <label htmlFor="new-password">New password</label>
        <div><input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /><button className="secondary"><KeyRound size={16} />Update</button></div>
      </form>
      <form action="/auth/signout" method="post" onSubmit={() => { void caches?.keys().then(keys => keys.forEach(k => caches.delete(k))); }}><button className="secondary signout">Sign out</button></form>
    </section>
    <section className="surface">
      <h3>About videos</h3>
      <p className="muted">Videos use YouTube’s player. If a creator blocks embedding, or a privacy extension interferes, use the “Watch on YouTube” link under the player.</p>
      <a className="text-button" href="https://developers.google.com/youtube/iframe_api_reference#onError" target="_blank" rel="noopener">YouTube playback documentation <ExternalLink size={15} /></a>
    </section>
  </main>;
}
