import { createClient } from '@/lib/supabase/server';
import { validEntry } from '@/lib/state';

const noStore = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to load your progress.' }, { status: 401 });
  // RLS limits this to the signed-in user's rows; the filter keeps the intent explicit.
  const { data, error } = await supabase.from('learning_state').select('key, value').eq('user_id', user.id);
  if (error) { console.error('Progress load failed', error); return Response.json({ error: 'Your progress could not be loaded. Please retry.' }, { status: 503 }); }
  return Response.json({ values: Object.fromEntries(data.map(r => [r.key, r.value])) }, { headers: noStore });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to save your progress.' }, { status: 401 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Origin mismatch' }, { status: 403 });
  let entries: [string, unknown][];
  try {
    const text = await request.text();
    if (text.length > 500000) throw new Error();
    const body = JSON.parse(text);
    if (!body.values || typeof body.values !== 'object' || Array.isArray(body.values)) throw new Error();
    entries = Object.entries(body.values);
    if (!entries.length || entries.length > 500 || entries.some(([k, v]) => !validEntry(k, v))) throw new Error();
  } catch { return Response.json({ error: 'Invalid progress data. Nothing was saved.' }, { status: 400 }); }
  const now = new Date().toISOString();
  const { error } = await supabase.from('learning_state').upsert(
    entries.map(([key, value]) => ({ user_id: user.id, key, value, updated_at: now })),
    { onConflict: 'user_id,key' },
  );
  if (error) { console.error('Progress save failed', error); return Response.json({ error: 'Could not save. Your changes are still on this page; retry before closing.' }, { status: 503 }); }
  return Response.json({ saved: true }, { headers: noStore });
}
