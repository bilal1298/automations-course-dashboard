'use client';
import { useState } from 'react';
import { BellRing, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { furthestStage, needsFollowUp, parseApplications, sources, stages, type Application, type Stage } from '@/lib/applications';
import { today } from '@/lib/srs';
import { useApp } from './app-context';

const blank = (): Omit<Application, 'id'> => ({ company: '', role: '', link: '', source: 'SEEK', applied: today(), stage: 'Applied', next: '', notes: '' });
const reached = (a: Application, stage: Stage) => furthestStage(a) >= stages.indexOf(stage);

export default function Applications() {
  const { values, change, loaded } = useApp();
  const list = parseApplications(values['career:applications']);
  const [draft, setDraft] = useState(blank);
  const [adding, setAdding] = useState(false);
  const save = (next: Application[]) => change('career:applications', JSON.stringify(next));
  const update = (id: string, patch: Partial<Application>) => save(list.map(a => {
    if (a.id !== id) return a;
    const next = { ...a, ...patch };
    return { ...next, furthest: Math.max(furthestStage(a), furthestStage(next)) };
  }));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    save([{ ...draft, id: crypto.randomUUID() }, ...list]);
    setDraft(blank()); setAdding(false);
  };

  const screens = list.filter(a => reached(a, 'Recruiter screen')).length;
  const technical = list.filter(a => reached(a, 'Technical')).length;
  const offers = list.filter(a => a.stage === 'Offer').length;
  const rate = (n: number) => list.length ? `${Math.round(n / list.length * 100)}%` : '–';
  const followUps = list.filter(needsFollowUp);

  return <section className="surface">
    <div className="row space-between"><h2>Applications</h2>{!adding && <button className="secondary" disabled={!loaded} onClick={() => setAdding(true)}><Plus size={16} />Add</button>}</div>
    <div className="funnel">
      <div><strong>{list.length}</strong><span>applied</span></div>
      <div><strong>{screens}</strong><span>screens · {rate(screens)}</span></div>
      <div><strong>{technical}</strong><span>technical · {rate(technical)}</span></div>
      <div><strong>{offers}</strong><span>offers</span></div>
    </div>
    {list.length >= 10 && screens === 0 && <p className="hint">10+ applications and no screens usually means a targeting or CV problem, not a skills problem. Revisit the CV lessons in the job search module.</p>}
    {followUps.length > 0 && <p className="hint"><BellRing size={15} /> {followUps.length} application{followUps.length === 1 ? '' : 's'} sent 5+ days ago with no next step. Time for one polite follow-up.</p>}

    {adding && <form className="app-form" onSubmit={add}>
      <label>Company<input required value={draft.company} onChange={e => setDraft({ ...draft, company: e.target.value })} /></label>
      <label>Role<input required value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} placeholder="AI Automation Specialist" /></label>
      <label>Job ad link<input type="url" value={draft.link} onChange={e => setDraft({ ...draft, link: e.target.value })} placeholder="https://…" /></label>
      <div className="app-form-row">
        <label>Source<select value={draft.source} onChange={e => setDraft({ ...draft, source: e.target.value })}>{sources.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Applied<input type="date" value={draft.applied} onChange={e => setDraft({ ...draft, applied: e.target.value })} /></label>
      </div>
      <div className="button-row"><button className="primary">Save application</button><button type="button" className="secondary" onClick={() => setAdding(false)}>Cancel</button></div>
    </form>}

    {list.length === 0 && !adding && <p className="muted">Log every application here. After 10–20 you’ll see where you drop off, and that tells you what to fix next.</p>}
    <div className="app-list">{list.map(a => <details key={a.id} className={`app-card stage-${stages.indexOf(a.stage)}`}>
      <summary>
        <span><b>{a.company}</b><small>{a.role}</small></span>
        <span className={`stage-chip ${a.stage === 'Rejected' ? 'rejected' : a.stage === 'Offer' ? 'offer' : ''}`}>{a.stage}</span>
        {needsFollowUp(a) && <BellRing size={15} className="follow" aria-label="Needs a follow-up" />}
      </summary>
      <div className="app-body-fields">
        <label>Stage<select disabled={!loaded} value={a.stage} onChange={e => update(a.id, { stage: e.target.value as Stage })}>{stages.map(s => <option key={s}>{s}</option>)}</select></label>
        <label>Next step<input disabled={!loaded} value={a.next} onChange={e => update(a.id, { next: e.target.value })} placeholder="e.g. Follow up Tuesday" /></label>
        <label>Notes: what they asked, what you missed<textarea disabled={!loaded} rows={3} value={a.notes} onChange={e => update(a.id, { notes: e.target.value })} /></label>
        <p className="muted">{a.source} · applied {a.applied || '–'}{a.link && <> · <a href={a.link} target="_blank" rel="noopener">ad <ExternalLink size={12} /></a></>}</p>
        <button className="text-button danger" disabled={!loaded} onClick={() => { if (confirm(`Delete ${a.company}?`)) save(list.filter(x => x.id !== a.id)); }}><Trash2 size={14} />Delete</button>
      </div>
    </details>)}</div>
  </section>;
}
