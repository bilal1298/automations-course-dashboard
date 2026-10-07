'use client';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import curriculum from '@/lib/curriculum.json';
import { clean, currentModule, doneCount, moduleNumber, moduleProgress, modules, nextStep } from '@/lib/progress';
import { useApp } from './app-context';

const phaseNames: Record<string, string> = { 'FOUNDATION': 'Foundation', 'PRODUCTION AUTOMATION': 'Production automation', 'AI ENGINEERING': 'AI engineering', 'PORTFOLIO': 'Portfolio projects', 'JOB CONVERSION': 'Landing the job' };

export default function Course() {
  const { values, go } = useApp();
  const total = modules.reduce((n, m) => n + m.tasks.length, 0);
  const done = modules.reduce((n, m) => n + doneCount(m, values), 0);
  const mastered = modules.filter(m => moduleProgress(m, values).mastered).length;
  const pace = Number(values.pace) || 18;
  const hoursLeft = Math.ceil(modules.reduce((n, m) => n + m.hours * (1 - doneCount(m, values) / m.tasks.length), 0));
  const current = currentModule(values);
  const next = nextStep(current, values);

  return <main className="content narrow course-page">
    <p className="eyebrow">AI AUTOMATION ENGINEERING</p>
    <h1>Course</h1>
    <p className="page-subtitle">16 modules. Each one is four steps: <b>Learn</b>, <b>Quiz</b>, <b>Build</b>, <b>Prove</b>.</p>

    <button className="continue-card" onClick={() => go(next.route)}>
      <span className="kicker">{done ? 'CONTINUE WHERE YOU LEFT OFF' : 'START HERE'}</span>
      <h2>Module {moduleNumber(current)}: {clean(current.title)}</h2>
      <p>{next.label}</p>
      <span className="continue-go">{done ? 'Continue' : 'Start learning'}<ArrowRight size={18} /></span>
    </button>

    <div className="course-stats">
      <div><strong>{mastered}<em>/16</em></strong><span>modules mastered</span></div>
      <div><strong>{done}<em>/{total}</em></strong><span>exercises done</span></div>
      <div><strong>~{Math.ceil(hoursLeft / pace)}<em> wks</em></strong><span>left at {pace}h/week</span></div>
    </div>

    {curriculum.phase_order.map(phase => <section key={phase} className="phase">
      <h2>{phaseNames[phase] ?? phase}</h2>
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
