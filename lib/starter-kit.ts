// Starter kit materials (web/starter-kit in the public repo) that help with each module's Build step.
const base = 'https://github.com/bilal1298/automations-course-dashboard/tree/main/starter-kit';

export const starterKit: Record<string, { what: string; path: string }[]> = {
  m1: [{ what: 'Fake CRM API with expiring tokens, pagination, rate limits and random failures', path: 'mock-api' }, { what: 'Webhook sender: signed, duplicate, out-of-order and tampered events', path: 'webhooks' }],
  m2: [{ what: 'Fake CRM API to page through, retry against and write tests for', path: 'mock-api' }],
  m3: [{ what: 'Practice database: 200k leads, replies and bookings, plus 10 exercises with answers', path: 'sql' }],
  m4: [{ what: 'Fake CRM API to practise retries, batching and rate limits in n8n', path: 'mock-api' }, { what: 'Webhook sender to test raw-event logging and replay', path: 'webhooks' }, { what: 'n8n + Postgres in Docker', path: 'docker' }],
  m5: [{ what: 'Webhook sender to test your FastAPI receiver', path: 'webhooks' }],
  m6: [{ what: 'n8n + Postgres compose file to build your stack from', path: 'docker' }],
  m7: [{ what: '60 labelled support tickets: a ready-made eval set', path: 'data' }],
  m8: [{ what: '8 policy documents and 28 labelled questions for retrieval evals', path: 'data' }],
  m11: [{ what: 'Fake CRM API to upsert leads into', path: 'mock-api' }],
  m12: [{ what: '8 policy documents (one versioned, one poisoned) and 28 eval questions', path: 'data' }],
  m17: [{ what: '40 messy customer enquiries for a fictional electrician: your test inputs', path: 'data' }],
};

export const starterUrl = (path: string) => `${base}/${path}`;
export const starterRepo = base;
