import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

// Written feedback on an interview answer or a CV bullet / outreach message, from Claude.
// Disabled unless ANTHROPIC_API_KEY is set. Each user gets DAILY_LIMIT requests per day.
const DAILY_LIMIT = 30;
const MAX_INPUT = 4000;

const prompts: Record<string, string> = {
  interview: `You are an experienced hiring manager for AI Automation Specialist / Engineer roles, coaching a career-switcher who knows n8n and is learning Python, APIs and LLMs.
You'll get an interview question, the points a strong answer covers, and the candidate's answer (often a voice-to-text transcript, so ignore filler words and typos).
Reply in plain text, under 220 words, in exactly this shape:
Score: N/5 (one short reason)
What worked:
- 1–2 bullets
What to improve:
- 2–3 specific bullets, naming any key point from the guide they missed
Stronger answer:
A rewritten answer of at most 90 words that keeps their real experience and doesn't invent facts, numbers or employers.`,
  cv: `You are a recruiter who places people in AI automation roles. Review the candidate's CV bullet, LinkedIn text or outreach message.
Reply in plain text, under 180 words, in exactly this shape:
Verdict: one sentence
What to improve:
- 2–3 specific bullets (clarity, the problem → system → result structure, concrete tools, length)
Rewrite:
One improved version. Keep it truthful: never invent metrics, employers or tools; where a number would help, write [your number] as a placeholder.`,
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI feedback isn’t set up yet.' }, { status: 503 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to get feedback.' }, { status: 401 });
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Origin mismatch' }, { status: 403 });

  let kind: string, text: string, question = '', guide = '';
  try {
    const body = await request.json();
    kind = String(body.kind); text = String(body.text ?? '').trim();
    question = String(body.question ?? '').slice(0, 500); guide = String(body.guide ?? '').slice(0, 1500);
    if (!prompts[kind] || text.length < 10 || text.length > MAX_INPUT) throw new Error();
  } catch { return Response.json({ error: `Write between 10 and ${MAX_INPUT.toLocaleString()} characters.` }, { status: 400 }); }

  // Daily allowance, stored with the user's progress as "YYYY-MM-DD|count".
  const day = new Date().toISOString().slice(0, 10);
  const { data: row } = await supabase.from('learning_state').select('value').eq('user_id', user.id).eq('key', 'ai:usage').maybeSingle();
  const [usedDay, usedCount] = String(row?.value ?? '').split('|');
  const used = usedDay === day ? Number(usedCount) || 0 : 0;
  if (used >= DAILY_LIMIT) return Response.json({ error: `You’ve used today’s ${DAILY_LIMIT} feedback requests. More tomorrow.` }, { status: 429 });
  await supabase.from('learning_state').upsert({ user_id: user.id, key: 'ai:usage', value: `${day}|${used + 1}`, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });

  const content = kind === 'interview'
    ? `Question: ${question}\n\nWhat a strong answer covers: ${guide}\n\nCandidate's answer:\n${text}`
    : `Text to review:\n${text}`;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      // Short coaching feedback doesn't need deep reasoning; low effort keeps it quick and cheap.
      output_config: { effort: 'low' },
      // If a safety classifier declines, retry on Anthropic's recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: prompts[kind],
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') return Response.json({ error: 'Couldn’t give feedback on that. Try rephrasing it.' }, { status: 422 });
    const feedback = response.content.flatMap(b => b.type === 'text' ? [b.text] : []).join('\n').trim();
    if (!feedback) return Response.json({ error: 'No feedback came back. Try again.' }, { status: 502 });
    return Response.json({ feedback, remaining: DAILY_LIMIT - used - 1 }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message)) { console.error('Feedback: Anthropic account has no credit'); return Response.json({ error: 'AI feedback is paused: the AI account needs credit.' }, { status: 503 }); }
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: 'The AI service is busy. Try again in a minute.' }, { status: 503 });
    if (error instanceof Anthropic.AuthenticationError) { console.error('Feedback: invalid ANTHROPIC_API_KEY'); return Response.json({ error: 'AI feedback isn’t set up correctly.' }, { status: 503 }); }
    console.error('Feedback failed', error);
    return Response.json({ error: 'Couldn’t get feedback right now. Try again.' }, { status: 502 });
  }
}
