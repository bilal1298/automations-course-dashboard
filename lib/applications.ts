// Job applications are stored as one JSON string under `career:applications`.
export const stages = ['Applied', 'Recruiter screen', 'Technical', 'Take-home', 'Final round', 'Offer', 'Rejected'] as const;
export type Stage = (typeof stages)[number];
export const sources = ['SEEK', 'LinkedIn', 'Referral', 'n8n community', 'Company site', 'Upwork', 'Other'] as const;

export type Application = {
  id: string;
  company: string;
  role: string;
  link: string;
  source: string;
  applied: string; // YYYY-MM-DD
  stage: Stage;
  next: string;
  notes: string;
  furthest?: number; // index of the furthest stage reached, kept when an application is rejected
};

export function parseApplications(value: unknown): Application[] {
  if (typeof value !== 'string' || !value) return [];
  try { const list = JSON.parse(value); return Array.isArray(list) ? list : []; } catch { return []; }
}

export function validApplications(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 200000) return false;
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) && list.length <= 500 && list.every(a => a && typeof a === 'object' && typeof a.id === 'string' && typeof a.company === 'string' && (stages as readonly string[]).includes(a.stage)
      && (a.furthest === undefined || Number.isInteger(a.furthest)) && ['role', 'link', 'source', 'applied', 'next', 'notes'].every(k => typeof a[k] === 'string' && a[k].length <= 5000));
  } catch { return false; }
}

const daysSince = (date: string) => (Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000;
// Highest stage index this application reached, even if it was later rejected.
export const furthestStage = (a: Application) => Math.max(a.furthest ?? 0, a.stage === 'Rejected' ? 0 : stages.indexOf(a.stage));

export const needsFollowUp = (a: Application) => a.stage === 'Applied' && !!a.applied && daysSince(a.applied) >= 5 && !a.next;
