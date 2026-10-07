'use client';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import curriculum from '@/lib/curriculum.json';
import { clean, currentModule, doneCount, moduleNumber, moduleProgress, modules, nextStep } from '@/lib/progress';
import { useApp } from './app-context';

const phaseNames: Record<string, [string, string]> = {
  'FAST TRACK': ['Fast track to job-ready', 'The skills most job ads ask for, ending with a portfolio project. About 6–7 weeks at 18 hours a week.'],
  'JOB SEARCH': ['Apply and interview', 'Start applying once the case study is done. Keep learning while you interview.'],
  'LEVEL UP: ENGINEERING': ['Level up: engineering', 'Python, SQL, APIs of your own and deployment, for Engineer-titled roles.'],
  'LEVEL UP: ADVANCED AI': ['Level up: advanced AI', 'RAG, agents and security, for senior and AI-heavy roles.'],
  'ADVANCED PORTFOLIO': ['Advanced portfolio projects', 'Bigger systems that prove production depth.'],
};

export default function Course() {
  const { values, go } = useApp();
  const total = modules.reduce((n, m) => n + m.tasks.length, 0);
  const done = modules.reduce((n, m) => n + doneCount(m, values), 0);
  const mastered = modules.filter(m => moduleProgress(m, values).mastered).length;
  const pace = Number(values.pace) || 18;
  // Learn is roughly a third of a module's hours, Build the rest.
  const hoursLeft = Math.ceil(modules.reduce((n, m) => { const p = moduleProgress(m, values); return n + m.hours * (1 - (p.learn.done / p.learn.total) * 0.3 - (p.build.done / p.build.total) * 0.7); }, 0));
  const lessonsTotal = modules.reduce((n, m) => n + moduleProgress(m, values).learn.total, 0);
  const lessonsDone = modules.reduce((n, m) => n + moduleProgress(m, values).learn.done, 0);
  const current = currentModule(values);
  const next = nextStep(current, values);

  return <main className="content narrow course-page">
    <p className="eyebrow">AI AUTOMATION ENGINEERING</p>
    <h1>Course</h1>
    <p className="page-subtitle">Start with the fast track, then apply while you level up. Each module is four steps: <b>Learn</b>, <b>Quiz</b>, <b>Build</b>, <b>Prove</b>.</p>

    <button className="continue-card" onClick={() => go(next.route)}>
      <span className="kicker">{done || lessonsDone ? 'CONTINUE WHERE YOU LEFT OFF' : 'START HERE'}</span>
      <h2>Module {moduleNumber(current)}: {clean(current.title)}</h2>
      <p>{next.label}</p>
      <span className="continue-go">{done || lessonsDone ? 'Continue' : 'Start learning'}<ArrowRight size={18} /></span>
      <small className="continue-meta">{mastered} of {modules.length} modules mastered</small>
    </button>

    <div className="course-stats">
      <div><strong>{lessonsDone}<em>/{lessonsTotal}</em></strong><span>lessons done</span></div>
      <div><strong>{done}<em>/{total}</em></strong><span>exercises done</span></div>
      <div><strong>~{Math.ceil(hoursLeft / pace)}<em> wks</em></strong><span>left at {pace}h/week</span></div>
    </div>

    {curriculum.phase_order.map(phase => <section key={phase} className="phase">
      {phase === 'JOB SEARCH' && <div className="apply-marker"><b>🎯 Start applying here</b><span>Finish the fast track and your case study, then apply every week while you keep learning.</span></div>}
      <h2>{phaseNames[phase]?.[0] ?? phase}</h2>
      {phaseNames[phase] && <p className="phase-note">{phaseNames[phase][1]}</p>}
      <div className="module-list">{modules.filter(m => m.phase === phase).map(m => {
        const p = moduleProgress(m, values);
        const pct = Math.round(p.build.done / p.build.total * 100);
        return <button key={m.id} className={`module-row ${p.mastered ? 'mastered' : ''}`} onClick={() => go(`learn/${m.id}`)}>
          <span className="module-num">{p.mastered ? <Check size={18} /> : moduleNumber(m)}</span>
          <span className="module-info">
            <b>{clean(m.title)}</b>
            <small>{m.hours}h · {m.tasks.length} exercises{p.mastered ? ' · mastered' : p.started ? ` · ${pct}% built` : ''}</small>
            {p.started && !p.mastered && <Progress value={pct} />}
          </span>
          <ChevronRight size={18} className="module-chevron" />
        </button>;
      })}</div>
    </section>)}
    <p className="bottom-note">Progress reflects work you mark complete. Mastery means you can do it without AI assistance.</p>
  </main>;
}
