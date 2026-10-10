'use client';
import { useState } from 'react';
import { Check, CircleHelp, ListTodo, NotebookPen, Plus, StickyNote, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { lessons } from '@/lib/lessons';
import { noteTypes, parseNotes, type NoteType, type QuickNote } from '@/lib/notes';
import { clean, modules } from '@/lib/progress';
import { useApp } from './app-context';

const icons = { note: StickyNote, question: CircleHelp, todo: ListTodo };
const doneLabel = { note: '', question: 'Answered', todo: 'Done' };

export function useNotes() {
  const { values, change } = useApp();
  const notes = parseNotes(values['notes:items']);
  const save = (next: QuickNote[]) => change('notes:items', JSON.stringify(next));
  return { notes, save };
}

// A readable description of the page a note was written on, e.g. "SQL · Lesson 3: Transactions".
export function describePlace(route: string): { module?: string; where?: string } {
  const [view, mid, step, index] = route.split('/');
  const m = modules.find(x => x.id === mid);
  if (view !== 'learn' || !m) return {};
  const name = clean(m.title).split(/[:,(]/)[0].trim();
  const i = Number(index);
  const lesson = lessons[m.id];
  const place =
    step === 'learn' && lesson ? `Lesson ${(Number.isNaN(i) ? 0 : i) + 1}: ${lesson.sections[Number.isNaN(i) ? 0 : Math.min(i, lesson.sections.length - 1)].title}`
    : step === 'build' && !Number.isNaN(i) ? `Exercise ${i + 1}`
    : step === 'quiz' ? 'Quiz' : step === 'prove' ? 'Mastery check' : step === 'videos' ? 'Videos' : step === 'build' ? 'Exercises' : '';
  return { module: m.id, where: place ? `${name} · ${place}` : name };
}

function TypePicker({ value, onChange }: { value: NoteType; onChange: (t: NoteType) => void }) {
  return <div className="note-types" role="radiogroup" aria-label="Note type">
    {(Object.keys(noteTypes) as NoteType[]).map(t => { const Icon = icons[t]; return <button key={t} type="button" role="radio" aria-checked={value === t} className={`note-type ${t} ${value === t ? 'on' : ''}`} onClick={() => onChange(t)}><Icon size={16} /><span><b>{noteTypes[t].label}</b><small>{noteTypes[t].hint}</small></span></button>; })}
  </div>;
}

// Floating "+ Note" button for module screens; the note remembers the page it was written on.
export function QuickNoteButton({ route }: { route: string }) {
  const { loaded, go } = useApp();
  const { notes, save } = useNotes();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<NoteType>('note');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const place = describePlace(route);
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    save([{ id: crypto.randomUUID(), type, text: text.trim().slice(0, 4000), created: new Date().toISOString(), done: false, route, ...place }, ...notes]);
    setText(''); setSaved(true); setTimeout(() => { setSaved(false); setOpen(false); }, 700);
  };
  return <>
    <button className="note-fab" disabled={!loaded} onClick={() => setOpen(true)} aria-label="Add a note"><Plus size={20} /><span>Note</span></button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="note-sheet">
        <SheetHeader><SheetTitle>New note</SheetTitle><SheetDescription>{place.where ? `Linked to ${place.where}` : 'Saved to your notes'}</SheetDescription></SheetHeader>
        <form onSubmit={add} className="note-form">
          <TypePicker value={type} onChange={setType} />
          <textarea autoFocus rows={4} maxLength={4000} value={text} onChange={e => setText(e.target.value)} aria-label="Note text"
            placeholder={type === 'question' ? 'e.g. Why does HMAC need the raw body?' : type === 'todo' ? 'e.g. Set up the mock API and try a 429' : 'e.g. 401 = who are you? 403 = not allowed'} />
          <div className="button-row"><button className="primary" disabled={!text.trim()}>{saved ? <><Check size={16} />Saved</> : 'Save note'}</button><button type="button" className="secondary" onClick={() => { setOpen(false); go('notes'); }}>All notes</button></div>
        </form>
      </SheetContent>
    </Sheet>
  </>;
}

export function NoteList({ items, empty }: { items: QuickNote[]; empty: string }) {
  const { go, loaded } = useApp();
  const { notes, save } = useNotes();
  const update = (id: string, patch: Partial<QuickNote>) => save(notes.map(n => n.id === id ? { ...n, ...patch } : n));
  if (!items.length) return <p className="muted note-empty">{empty}</p>;
  return <ul className="note-list">{items.map(n => { const Icon = icons[n.type]; return <li key={n.id} className={`note-item ${n.type} ${n.done ? 'done' : ''}`}>
    <span className="note-icon"><Icon size={16} /></span>
    <div className="note-body">
      <p>{n.text}</p>
      <small>{new Date(n.created).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{n.where && <> · <button className="note-link" onClick={() => n.route && go(n.route)}>{n.where}</button></>}</small>
      <div className="note-actions">
        {n.type !== 'note' && <button className={`note-done ${n.done ? 'on' : ''}`} disabled={!loaded} onClick={() => update(n.id, { done: !n.done })}><Check size={14} />{n.done ? doneLabel[n.type] : n.type === 'todo' ? 'Mark done' : 'Mark answered'}</button>}
        <button className="note-delete" disabled={!loaded} aria-label="Delete note" onClick={() => { if (confirm('Delete this note?')) save(notes.filter(x => x.id !== n.id)); }}><Trash2 size={14} /></button>
      </div>
    </div>
  </li>; })}</ul>;
}

type Filter = 'all' | NoteType;

export function NotesView() {
  const { notes } = useNotes();
  const [filter, setFilter] = useState<Filter>('all');
  const [showDone, setShowDone] = useState(false);
  const open = (t: NoteType) => notes.filter(n => n.type === t && !n.done).length;
  const items = notes.filter(n => (filter === 'all' || n.type === filter) && (showDone || !n.done));
  const doneCount = notes.filter(n => n.done && (filter === 'all' || n.type === filter)).length;
  return <main className="content narrow">
    <p className="eyebrow">YOUR NOTEBOOK</p>
    <h1>Notes</h1>
    <p className="page-subtitle">Everything you jotted down while learning. Tap a note’s place to jump back to that lesson. Add notes with the <b>+ Note</b> button on any module screen.</p>
    <div className="note-filters" role="tablist">
      <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All <span>{notes.filter(n => !n.done).length}</span></button>
      {(Object.keys(noteTypes) as NoteType[]).map(t => <button key={t} role="tab" aria-selected={filter === t} className={filter === t ? 'on' : ''} onClick={() => setFilter(t)}>{noteTypes[t].plural} <span>{open(t)}</span></button>)}
    </div>
    <NoteList items={items} empty={notes.length ? 'Nothing here.' : 'No notes yet. Open any lesson and tap + Note.'} />
    {doneCount > 0 && <button className="text-button show-done" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'} {doneCount} answered or done</button>}
  </main>;
}

// Small summary for the Today screen: open questions and to-dos.
export function OpenNotesCard() {
  const { go } = useApp();
  const { notes } = useNotes();
  const questions = notes.filter(n => n.type === 'question' && !n.done).length;
  const todos = notes.filter(n => n.type === 'todo' && !n.done).length;
  if (!questions && !todos) return null;
  return <section className="today-card">
    <span className="small-icon"><NotebookPen size={20} /></span>
    <div><h2>Open notes</h2><p className="muted">{[questions && `${questions} question${questions === 1 ? '' : 's'} to look into`, todos && `${todos} to-do${todos === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</p></div>
    <button className="secondary" onClick={() => go('notes')}>Open</button>
  </section>;
}
