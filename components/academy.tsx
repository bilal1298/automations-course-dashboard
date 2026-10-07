'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BookOpen, BriefcaseBusiness, CalendarCheck, Circle, CloudCheck, ExternalLink, LoaderCircle, MessageSquare, RotateCw, Settings2, X } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Question } from '@/lib/lessons';
import { modules } from '@/lib/progress';
import { schedule } from '@/lib/srs';
import type { Stored } from '@/lib/state';
import { AppContext, type App } from './app-context';
import Course from './course';
import { ModuleOverview, StepPage, type Step } from './module';
import { CareerPage, InterviewPage, SettingsPage } from './pages';
import Today from './today';

const nav = [
  { id: 'today', label: 'Today', icon: CalendarCheck },
  { id: 'home', label: 'Course', icon: BookOpen },
  { id: 'interview', label: 'Interview', icon: MessageSquare },
  { id: 'career', label: 'Career', icon: BriefcaseBusiness },
];
const titles: Record<string, string> = { today: 'Today', home: 'Course', learn: 'Course', interview: 'Interview practice', career: 'Career tracker', settings: 'Settings' };

// Old bookmarks used read/watch/practice/gate; map them onto the four-step names.
const legacy: Record<string, string> = { read: 'learn', watch: 'videos', practice: 'build', gate: 'prove' };
const routePattern = /^(today|home|interview|career|settings|learn\/m\d{1,2}(\/(learn|quiz|build|prove|videos|notes)(\/\d+)?)?)$/;
function normalise(path: string, phone: boolean) {
  const fixed = path.replace(/^(learn\/m\d+\/)(read|watch|practice|gate)\b/, (_, a, b) => a + legacy[b]);
  if (routePattern.test(fixed)) return fixed;
  return !path && phone ? 'today' : 'home';
}

const subscribeHash = (onChange: () => void) => { window.addEventListener('hashchange', onChange); return () => window.removeEventListener('hashchange', onChange); };

// Only the API's own sign-in message is worth showing as-is; anything else gets a plain explanation.
const unauthMessage = (m: string) => m.startsWith('Sign in');

// These publishers send X-Frame-Options/frame-ancestors headers, so the embedded reading room would be blank.
const noFrame = /(^|\.)(github\.com|docker\.com|mozilla\.org|postgresql\.org|supabase\.com|anthropic\.com|openai\.com|linkedin\.com)$/;

export default function Academy({ email }: { email: string }) {
  // The URL hash is the router: bookmarkable, and the back button works.
  const hash = useSyncExternalStore(subscribeHash, () => location.hash, () => '#home');
  const route = normalise(decodeURIComponent(hash.slice(1)), typeof window !== 'undefined' && window.innerWidth < 768);
  const [values, setValues] = useState<Stored>({});
  const valuesRef = useRef<Stored>({});
  const pending = useRef<Stored>({});
  const busy = useRef(false);
  const retryIn = useRef(2000);
  const nextTry = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('Loading progress');
  const [error, setError] = useState('');
  const [unauth, setUnauth] = useState(false);
  const [notice, setNotice] = useState('');
  const [resource, setResource] = useState<string[] | null>(null);
  const [importData, setImportData] = useState<Stored | null>(null);

  const go = useCallback((path: string) => { window.location.hash = path; }, []);
  const change = useCallback((key: string, value: Stored[string]) => {
    if (!loaded) return;
    pending.current[key] = value;
    valuesRef.current = { ...valuesRef.current, [key]: value };
    setValues(valuesRef.current); setStatus('Unsaved changes');
  }, [loaded]);
  const answer = useCallback((q: Question, correct: boolean) => {
    change(`srs:${q.id}`, schedule(valuesRef.current[`srs:${q.id}`], correct));
    if (correct) change(`passed:${q.id}`, true);
  }, [change]);
  const openDoc = useCallback((doc: string[]) => { if (noFrame.test(new URL(doc[1]).hostname)) window.open(doc[1], '_blank', 'noopener'); else setResource(doc); }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/progress', { cache: 'no-store' });
      const data = await res.json() as { error?: string; values: Stored };
      if (!res.ok) { setUnauth(res.status === 401); throw new Error(data.error); }
      valuesRef.current = data.values; setValues(data.values); setLoaded(true); setUnauth(false); setError(''); setStatus('All changes saved');
    } catch (e) { setError(e instanceof Error && unauthMessage(e.message) ? e.message : 'Couldn’t load your progress. Check your connection and retry.'); setStatus('Progress unavailable'); }
  }, []);

  // Changes are queued and saved once a second, in order. A failed save keeps them on the page.
  const flush = useCallback(async () => {
    if (busy.current || !Object.keys(pending.current).length) return;
    busy.current = true; const snapshot = { ...pending.current }; const quiet = Object.keys(snapshot).every(k => k === 'resume');
    if (!quiet) setStatus('Saving');
    try {
      const res = await fetch('/api/progress', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: snapshot }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error);
      for (const [k, v] of Object.entries(snapshot)) if (pending.current[k] === v) delete pending.current[k];
      setError(''); if (!quiet) setStatus(Object.keys(pending.current).length ? 'Unsaved changes' : 'All changes saved');
      retryIn.current = 2000;
    } catch {
      // Keep the changes and try again with growing gaps (2s, 4s … 60s); reconnecting retries at once.
      setError('Not saved yet: you seem to be offline. Your changes are kept on this page and will save automatically.'); setStatus('Changes not saved');
      nextTry.current = Date.now() + retryIn.current; retryIn.current = Math.min(retryIn.current * 2, 60000);
    }
    busy.current = false;
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only sets state after the fetch resolves
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = setInterval(() => { if (Date.now() >= nextTry.current) void flush(); }, 1000);
    const online = () => { nextTry.current = 0; void flush(); };
    window.addEventListener('online', online);
    return () => { clearInterval(id); window.removeEventListener('online', online); };
  }, [flush]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (Object.keys(pending.current).length) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Old or invalid links show the right page; make the address bar match it too.
    // Read the real hash here (not `route`, which is the server's guess during hydration) so deep links survive a reload.
    const actual = decodeURIComponent(location.hash.slice(1));
    const canonical = normalise(actual, window.innerWidth < 768);
    if (actual && canonical !== actual) history.replaceState(null, '', '#' + canonical);
    // Remember the module you're in (for Continue) without flashing the save status.
    if (loaded && route.startsWith('learn/') && valuesRef.current.resume !== route) { pending.current.resume = route; valuesRef.current = { ...valuesRef.current, resume: route }; }
  }, [route, loaded]);

  const [view, mid, step, index] = route.split('/');
  const current = modules.find(m => m.id === mid);
  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), values: valuesRef.current }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'automation-academy-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
  };
  const app: App = { values, loaded, change, go, answer, openDoc };
  const active = (id: string) => view === id || id === 'home' && view === 'learn';

  return <AppContext.Provider value={app}><SidebarProvider style={{ '--sidebar-width': '232px' } as React.CSSProperties}>
    <Sidebar>
      <SidebarHeader className="brand"><span className="brand-mark">a<span>•</span></span><div>Automation<span>ACADEMY</span></div></SidebarHeader>
      <SidebarContent className="nav-content"><SidebarMenu>{nav.map(({ id, label, icon: Icon }) => <SidebarMenuItem key={id}>
        <SidebarMenuButton className="nav-button" isActive={active(id)} onClick={() => go(id)}><Icon /><span>{id === 'interview' ? 'Interview practice' : id === 'career' ? 'Career tracker' : label}</span></SidebarMenuButton>
      </SidebarMenuItem>)}</SidebarMenu></SidebarContent>
      <SidebarFooter className="nav-footer">
        <SidebarMenuButton className="nav-button" isActive={view === 'settings'} onClick={() => go('settings')}><Settings2 />Settings</SidebarMenuButton>
        <div className="profile"><span>{email.slice(0, 2).toUpperCase()}</span><div>Signed in<small>{email}</small></div></div>
      </SidebarFooter>
    </Sidebar>
    <div className="app-body">
      <header className="topbar">
        <div className="breadcrumbs"><SidebarTrigger className="desktop-only" /><b>{titles[view]}</b></div>
        <div className="save-status" role="status">{status === 'Saving' || !loaded && !error ? <LoaderCircle className="spin" size={15} /> : loaded && !error ? <CloudCheck size={16} /> : <Circle size={14} />}<span>{status}</span></div>
      </header>
      {error && <div className="error-banner" role="alert"><span>{error}</span>{unauth ? <a href="/login">Sign in</a> : <button onClick={() => { if (loaded) void flush(); else { setStatus('Loading progress'); void load(); } }}><RotateCw size={15} />Retry</button>}</div>}
      {notice && <div className="notice" role="status">{notice.startsWith('Progress imported') && status === 'All changes saved' ? 'Progress imported and saved.' : notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={16} /></button></div>}

      {!loaded && !error ? <main className="content narrow loading-page" aria-busy="true"><div className="skeleton tall" /><div className="skeleton" /><div className="skeleton" /></main> : <>
      {view === 'today' && <Today values={values} answer={answer} go={go} loaded={loaded} />}
      {view === 'home' && <Course />}
      {view === 'learn' && current && (step ? <StepPage key={route} m={current} step={step as Step} index={index === undefined ? -1 : Number(index)} /> : <ModuleOverview m={current} />)}
      {view === 'interview' && <InterviewPage />}
      {view === 'career' && <CareerPage />}
      {view === 'settings' && <SettingsPage email={email} exportProgress={exportProgress} onImport={setImportData} />}
      </>}

      <nav className="mobile-tabbar" aria-label="Main">
        {[...nav, { id: 'settings', label: 'Settings', icon: Settings2 }].map(({ id, label, icon: Icon }) => <button key={id} className={active(id) ? 'active' : ''} aria-current={active(id) ? 'page' : undefined} onClick={() => go(id)}><Icon size={21} /><span>{label}</span></button>)}
      </nav>
    </div>

    <Sheet open={!!resource} onOpenChange={v => !v && setResource(null)}>
      <SheetContent className="reading-room" side="right">
        <SheetHeader><SheetTitle>{resource?.[0]}</SheetTitle><SheetDescription>Official reference. If this stays blank, open the original.</SheetDescription></SheetHeader>
        {resource && <><a className="secondary doc-external" href={resource[1]} target="_blank" rel="noopener">Open original <ExternalLink size={15} /></a><iframe src={resource[1]} title={resource[0]} referrerPolicy="strict-origin-when-cross-origin" className="docs-frame" /></>}
      </SheetContent>
    </Sheet>
    <AlertDialog open={!!importData} onOpenChange={v => !v && setImportData(null)}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Import this progress file?</AlertDialogTitle><AlertDialogDescription>This merges {Object.keys(importData || {}).length} fields. Matching exercises, notes and career fields will be replaced. Export your current progress first if you want a backup.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { if (importData) { for (const [k, v] of Object.entries(importData)) change(k, v); setNotice('Progress imported. Saving…'); setImportData(null); } }}>Import</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SidebarProvider></AppContext.Provider>;
}
