'use client';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, Circle, Clock3, ExternalLink, FileText, Hammer, Laptop, ListChecks, Lock, NotebookPen, Play, ShieldCheck, Smartphone, Trophy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { handbook } from '@/lib/handbook';
import { PASS_MARK } from '@/lib/lessons';
import { sectionDone, clean, isUrl, moduleNumber, moduleProgress, modules, nextStep, type Module } from '@/lib/progress';
import { useApp } from './app-context';
import { QuizPanel, SectionView } from './lesson';
import VideoPlayer from './video-player';
import { ModuleGlossary } from './rich-text';

export type Step = 'learn' | 'quiz' | 'build' | 'prove' | 'videos' | 'notes';
const videoTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const shortTask = (s: string) => s.split(/: |\. /)[0].slice(0, 110);
const evidenceBrief: Record<string, string> = {
  interview: 'Record your answer without notes. Explain the decision, the alternative you rejected, and what would change your answer.',
  learn: 'Explain the concept in your own words, then create a small working example. Record one edge case and show what happens.',
  prove: 'Run this without AI assistance. Capture the expected result, the actual result, and the failure or boundary condition you tested.',
};

/* ---------- Module overview: the 4-step path ---------- */

export function ModuleOverview({ m }: { m: Module }) {
  const { values, go, openDoc } = useApp();
  const p = moduleProgress(m, values);
  const next = nextStep(m, values);
  const phoneTasks = p.lesson?.tasks.filter(t => t.device === 'phone').length ?? 0;
  const lessonMinutes = p.lesson?.sections.reduce((n, s) => n + s.minutes, 0) ?? 0;
  const steps = [
    { id: 'learn', icon: BookOpen, title: 'Learn', desc: p.lesson ? `${p.learn.total} short lessons with quick checks · ${lessonMinutes} min` : 'Read the lesson · about 15 min', status: p.lesson ? `${p.learn.done}/${p.learn.total}` : p.learn.complete ? 'Read' : '', complete: p.learn.complete },
    { id: 'quiz', icon: ListChecks, title: 'Quiz', desc: p.quiz ? `${p.quiz.questions} scenario questions · pass at ${PASS_MARK}%` : 'Coming soon for this module', status: p.quiz?.best != null ? `${p.quiz.best}%` : '', complete: !!p.quiz?.passed && p.quiz.best !== null, locked: !p.quiz },
    { id: 'build', icon: Hammer, title: 'Build', desc: `${m.tasks.length} hands-on exercises${phoneTasks ? ` · ${phoneTasks} work on your phone` : ''}`, status: `${p.build.done}/${p.build.total}`, complete: p.build.complete },
    { id: 'prove', icon: ShieldCheck, title: 'Prove', desc: 'Mastery check: link your evidence and sign off', status: p.mastered ? 'Mastered' : '', complete: p.mastered },
  ];
  return <main className="content narrow module-page">
    <button className="back-link" onClick={() => go('home')}><ArrowLeft size={16} />All modules</button>
    <p className="eyebrow">MODULE {moduleNumber(m)} · {m.phase.replace('JOB CONVERSION', 'CAREER')}</p>
    <h1>{clean(m.title)}</h1>
    <p className="page-subtitle">{m.outcome}</p>
    <button className="primary continue-button" onClick={() => go(next.route)}><span><small>{p.mastered ? 'Module mastered' : p.started ? 'Continue' : 'Start here'}</small>{next.label}</span><ArrowRight size={20} /></button>
    <ol className="path">
      {steps.map((s, i) => <li key={s.id}>
        <button className={`path-step ${s.complete ? 'complete' : ''}`} disabled={s.locked} onClick={() => go(`learn/${m.id}/${s.id}`)}>
          <span className="path-number">{s.complete ? <Check size={18} /> : s.locked ? <Lock size={15} /> : i + 1}</span>
          <span className="path-text"><b>{s.title}</b><small>{s.desc}</small></span>
          {s.status && <span className="path-status">{s.status}</span>}
          {!s.locked && <ChevronRight size={18} className="path-chevron" />}
        </button>
      </li>)}
    </ol>
    <h2 className="extras-heading">Extras</h2>
    <div className="extras">
      <button className="extra-row" onClick={() => go(`learn/${m.id}/videos`)}><Play size={18} /><span>Videos<small>{m.videos.length} curated {m.videos.length === 1 ? 'clip' : 'clips'}</small></span><ChevronRight size={16} /></button>
      <button className="extra-row" onClick={() => go(`learn/${m.id}/notes`)}><NotebookPen size={18} /><span>My notes<small>{String(values[`note:${m.id}`] || '').length ? 'Saved' : 'Empty'}</small></span><ChevronRight size={16} /></button>
      {m.docs.map(doc => <button key={doc[1]} className="extra-row" onClick={() => openDoc(doc)}><FileText size={18} /><span>{doc[0]}<small>Official docs</small></span><ExternalLink size={15} /></button>)}
    </div>
    <p className="bottom-note"><Clock3 size={14} /> About {m.hours} hours in total, most of it in Build.</p>
  </main>;
}

/* ---------- Shared header for every step page ---------- */

function StepHeader({ m, step }: { m: Module; step: Step }) {
  const { values, go } = useApp();
  const p = moduleProgress(m, values);
  const tabs: [Step, string, boolean][] = [['learn', 'Learn', p.learn.complete], ['quiz', 'Quiz', !!p.quiz?.passed && p.quiz.best !== null], ['build', 'Build', p.build.complete], ['prove', 'Prove', p.mastered]];
  return <div className="step-header">
    <button className="back-link" onClick={() => go(`learn/${m.id}`)}><ArrowLeft size={16} />Module {moduleNumber(m)}: {clean(m.title)}</button>
    {['learn', 'quiz', 'build', 'prove'].includes(step) && <nav className="stepper" aria-label="Module steps">
      {tabs.map(([id, label, done], i) => <button key={id} disabled={id === 'quiz' && !p.quiz} className={`${step === id ? 'current' : ''} ${done ? 'done' : ''}`} aria-current={step === id ? 'step' : undefined} onClick={() => go(`learn/${m.id}/${id}`)}>
        <span>{done ? <Check size={13} /> : i + 1}</span>{label}
      </button>)}
    </nav>}
  </div>;
}

function NextBar({ back, next, quiet }: { back?: [string, string]; next?: [string, string]; quiet?: boolean }) {
  const { go } = useApp();
  return <div className="next-bar">
    {back ? <button className="secondary" onClick={() => go(back[1])}><ArrowLeft size={16} />{back[0]}</button> : <span />}
    {next && <button className={quiet ? 'secondary' : 'primary'} onClick={() => go(next[1])}>{next[0]}<ArrowRight size={16} /></button>}
  </div>;
}

/* ---------- Step 1: Learn ---------- */

function LearnStep({ m, index }: { m: Module; index: number }) {
  const { values, change, loaded, go } = useApp();
  const p = moduleProgress(m, values);
  const afterLearn: [string, string] = p.quiz ? ['Next: Quiz', `learn/${m.id}/quiz`] : ['Next: Build', `learn/${m.id}/build`];
  if (p.lesson) {
    const sections = p.lesson.sections;
    const i = Math.min(index, sections.length - 1);
    const s = sections[i];
    const last = i === sections.length - 1;
    return <>
      <div className="lesson-progress"><span>Lesson {i + 1} of {sections.length} · {s.minutes} min</span><span className="dots">{sections.map((_, j) => <button key={j} aria-label={`Lesson ${j + 1}`} className={j === i ? 'current' : sectionDone(values, sections[j].check) ? 'done' : ''} onClick={() => go(`learn/${m.id}/learn/${j}`)} />)}</span></div>
      {i === 0 && <div className="why-box"><b>Why this matters</b><p>{p.lesson.intro}</p></div>}
      <h2 className="lesson-title">{s.title}</h2>
      <SectionView key={s.title} section={s} />
      {last && <div className="takeaways"><h3>Keep these in mind</h3><ul>{m.notes.map(n => <li key={n}>{n}</li>)}</ul></div>}
      <NextBar back={i > 0 ? ['Previous', `learn/${m.id}/learn/${i - 1}`] : undefined} next={last ? afterLearn : ['Next lesson', `learn/${m.id}/learn/${i + 1}`]} quiet={!sectionDone(values, s.check)} />
    </>;
  }
  // Modules not yet rewritten: the original reading, on one page.
  return <>
    <div className="why-box"><b>Why this matters</b><p>{m.why}</p></div>
    <article className="lesson-section">
      {handbook[m.id]?.map((part, i) => <section key={part.title} className="handbook-part"><h3><span>{String(i + 1).padStart(2, '0')}</span>{part.title}</h3><p>{part.body}</p>{part.example && <pre><code>{part.example}</code></pre>}</section>)}
    </article>
    <div className="takeaways"><h3>Keep these in mind</h3><ul>{m.notes.map(n => <li key={n}>{n}</li>)}</ul></div>
    <label className={`completion-row ${values[`read:${m.id}`] ? 'checked' : ''}`}><Checkbox disabled={!loaded} checked={values[`read:${m.id}`] === true} onCheckedChange={v => change(`read:${m.id}`, v === true)} /><span><b>I’ve read and understood this</b><small>Plain-language lessons and quizzes for this module are on the way.</small></span></label>
    <NextBar next={afterLearn} />
  </>;
}

/* ---------- Step 3: Build ---------- */

function BuildList({ m }: { m: Module }) {
  const { values, go } = useApp();
  const p = moduleProgress(m, values);
  return <>
    <h2 className="step-title">Build it</h2>
    <p className="muted step-intro">Hands-on exercises. Tick each one off when you can do it without help, and save your evidence.{p.lesson && ' 📱 exercises work on your phone.'}</p>
    <div className="task-list">{m.tasks.map((t, i) => {
      const plain = p.lesson?.tasks[i];
      return <button key={i} className={`task-row ${values[`${m.id}-${i}`] ? 'done' : ''}`} onClick={() => go(`learn/${m.id}/build/${i}`)}>
        {values[`${m.id}-${i}`] ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        <span><small>Exercise {i + 1}{plain && (plain.device === 'phone' ? ' · 📱 phone' : ' · 💻 computer')}</small>{plain ? plain.plain : shortTask(t[1])}</span>
        <ChevronRight size={16} />
      </button>;
    })}</div>
    <NextBar back={p.quiz ? ['Quiz', `learn/${m.id}/quiz`] : ['Learn', `learn/${m.id}/learn`]} next={p.build.complete ? ['Next: Prove', `learn/${m.id}/prove`] : undefined} />
  </>;
}

function BuildTask({ m, index }: { m: Module; index: number }) {
  const { values, change, loaded, go } = useApp();
  const p = moduleProgress(m, values);
  const i = Math.min(index, m.tasks.length - 1);
  const task = m.tasks[i];
  const plain = p.lesson?.tasks[i];
  const done = values[`${m.id}-${i}`] === true;
  const related = m.videoDetails.map((d, v) => ({ d, v })).filter(({ d }) => d.taskIndices.includes(i));
  const last = i === m.tasks.length - 1;
  return <>
    <button className="text-button task-back" onClick={() => go(`learn/${m.id}/build`)}><ArrowLeft size={14} />All {m.tasks.length} exercises</button>
    <div className="task-meta"><span className="eyebrow">EXERCISE {i + 1} OF {m.tasks.length}</span>{plain && <span className="chip">{plain.device === 'phone' ? <><Smartphone size={13} />Phone-friendly</> : <><Laptop size={13} />Needs a computer</>}</span>}</div>
    <h2 className="task-title">{plain ? plain.plain : task[1]}</h2>
    {plain
      ? <><div className="done-looks-like"><b>Done looks like</b><p>{plain.done}</p></div><details className="interview-version"><summary><FileText size={16} />Technical brief</summary><p>{task[1]}</p></details></>
      : <div className="done-looks-like"><b>Done looks like</b><p>{evidenceBrief[task[0]] ?? 'Build it from a clean starting point. Save the code or workflow, demonstrate the happy path, and capture a failure plus the recovery.'}</p></div>}
    {related.length > 0 && <div className="related-videos"><h3>Helpful videos</h3><div>{related.map(({ v }) => <button className="secondary" key={v} onClick={() => go(`learn/${m.id}/videos/${v}`)}><Play size={14} />{m.videos[v][0]}</button>)}</div></div>}
    <label className={`completion-row ${done ? 'checked' : ''}`}><Checkbox disabled={!loaded} checked={done} onCheckedChange={v => { change(`${m.id}-${i}`, v === true); if (v !== true) change(`gate:${m.id}`, false); }} /><span><b>I can do this on my own</b><small>Tick it when you have evidence, not just familiarity.</small></span></label>
    <NextBar back={i > 0 ? ['Previous', `learn/${m.id}/build/${i - 1}`] : undefined} next={last ? ['Next: Prove', `learn/${m.id}/prove`] : ['Next exercise', `learn/${m.id}/build/${i + 1}`]} />
  </>;
}

/* ---------- Step 4: Prove ---------- */

function ProveStep({ m }: { m: Module }) {
  const { values, change, loaded, go } = useApp();
  const p = moduleProgress(m, values);
  const idx = modules.indexOf(m);
  const items = [
    { met: p.build.complete, label: `All ${m.tasks.length} exercises ticked off (${p.build.done}/${p.build.total})`, action: !p.build.complete && ['Open exercises', `learn/${m.id}/build`] },
    ...(p.quiz ? [{ met: p.quiz.passed && p.quiz.best !== null, label: `Quiz score ${PASS_MARK}% or more${p.quiz.best !== null ? ` (best ${p.quiz.best}%)` : ''}`, action: !p.quiz.passed && ['Take the quiz', `learn/${m.id}/quiz`] }] : []),
  ] as { met: boolean; label: string; action: false | [string, string] }[];
  return <>
    <h2 className="step-title">Prove you can do it</h2>
    <div className="gate-card"><span className="eyebrow">THE CHALLENGE · NO AI ASSISTANT</span><p>{m.gate}</p><small>Use docs, explain your trade-offs, and show one failure and how you recover from it.</small></div>
    <ul className="gate-checklist">
      {items.map(item => <li key={item.label} className={item.met ? 'met' : ''}>{item.met ? <CheckCircle2 size={19} /> : <Circle size={19} />}<span>{item.label}{item.action && <button className="text-button" onClick={() => go(item.action ? item.action[1] : '')}>{item.action[0]}</button>}</span></li>)}
      <li className={isUrl(p.evidence) ? 'met' : ''}>{isUrl(p.evidence) ? <CheckCircle2 size={19} /> : <Circle size={19} />}<span>Link to your evidence: a GitHub repo, Loom video or write-up<input type="url" disabled={!loaded} placeholder="https://github.com/…" value={p.evidence} maxLength={2000} onChange={e => change(`evidence:${m.id}`, e.target.value)} /></span></li>
    </ul>
    <label className={`completion-row ${p.mastered ? 'checked' : ''}`}><Checkbox disabled={!loaded || !p.ready} checked={p.mastered} onCheckedChange={v => change(`gate:${m.id}`, v === true)} /><span><b>I passed the challenge</b><small>{p.ready ? 'Be honest. You’re the one who has to do this in an interview.' : 'Complete the checklist above to unlock this.'}</small></span></label>
    {p.mastered && <div className="success-note"><Trophy size={20} />Module mastered. Your evidence is the achievement.</div>}
    <NextBar back={['Build', `learn/${m.id}/build`]} next={idx < modules.length - 1 ? ['Next module', `learn/${modules[idx + 1].id}`] : ['Career tracker', 'career']} />
  </>;
}

/* ---------- Extras: videos and notes ---------- */

function VideosPage({ m, index }: { m: Module; index: number }) {
  const { go } = useApp();
  const i = Math.min(index, m.videos.length - 1);
  const v = m.videos[i];
  const detail = m.videoDetails[i];
  const isClip = Number(v[3]) > 0;
  return <>
    <h2 className="step-title">Videos</h2>
    <div className="video-list">{m.videos.map((video, j) => <button key={j} className={j === i ? 'active' : ''} onClick={() => go(`learn/${m.id}/videos/${j}`)}><Play size={15} /><span><b>{video[0]}</b><small>{m.videoDetails[j].creator} · {Number(video[3]) > 0 ? `${videoTime(Number(video[3]) - Number(video[2]))} clip` : 'Full video'}</small></span></button>)}</div>
    <h3 className="video-title">{v[0]}</h3>
    <p className="muted">{detail.focus}{isClip && ` Plays ${videoTime(Number(v[2]))}–${videoTime(Number(v[3]))} of the original.`}</p>
    <VideoPlayer key={String(v[1]) + i} video={v} />
    {detail.taskIndices.length > 0 && <button className="secondary practise-video" onClick={() => go(`learn/${m.id}/build/${detail.taskIndices[0]}`)}><Hammer size={15} />Practise this: exercise {detail.taskIndices[0] + 1}</button>}
  </>;
}

function NotesPage({ m }: { m: Module }) {
  const { values, change, loaded } = useApp();
  const note = String(values[`note:${m.id}`] || '');
  return <>
    <h2 className="step-title">My notes</h2>
    <p className="muted step-intro">Evidence links, debugging notes and questions to revisit. Saves automatically.</p>
    <textarea className="notes-box" aria-label={`Notes for ${clean(m.title)}`} disabled={!loaded} maxLength={20000} value={note} onChange={e => change(`note:${m.id}`, e.target.value)} placeholder={'What I built\n\nEvidence / repository link\n\nWhat failed and how I fixed it\n\nWhat I need to revisit'} rows={16} />
    <p className="muted">{note.length.toLocaleString()} / 20,000 characters</p>
  </>;
}

export function StepPage({ m, step, index }: { m: Module; step: Step; index: number }) {
  const { values } = useApp();
  const p = moduleProgress(m, values);
  const content =
    step === 'learn' ? <LearnStep m={m} index={index} />
    : step === 'quiz' && p.quiz ? <><h2 className="step-title">Module quiz</h2><QuizPanel mid={m.id} onPassed={<NextBarButton to={`learn/${m.id}/build`} label="Next: Build" />} /></>
    : step === 'build' ? (index >= 0 ? <BuildTask m={m} index={index} /> : <BuildList m={m} />)
    : step === 'prove' ? <ProveStep m={m} />
    : step === 'videos' ? <VideosPage m={m} index={Math.max(index, 0)} />
    : step === 'notes' ? <NotesPage m={m} />
    : <LearnStep m={m} index={0} />;
  return <main className="content narrow step-page"><ModuleGlossary value={p.lesson?.glossary ?? {}}><StepHeader m={m} step={step} />{content}</ModuleGlossary></main>;
}

function NextBarButton({ to, label }: { to: string; label: string }) {
  const { go } = useApp();
  return <button className="primary" onClick={() => go(to)}>{label}<ArrowRight size={16} /></button>;
}
