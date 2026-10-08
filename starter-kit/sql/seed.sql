-- =====================================================================
-- Starter kit: practice database for the SQL module
-- =====================================================================
--
-- Creates four tables for a simulated lead-handling automation:
--
--   leads     one row per person who enquired      (~200,000 by default)
--   replies   messages a lead sent back            (~1 per 2 leads)
--   bookings  appointments a lead made             (~1 per 8 leads)
--   events    raw inbound webhook events (JSONB)  (~1 per lead)
--
-- Run it with psql (it uses psql's \set and \if, so run it with psql,
-- not a GUI query window):
--
--   psql -d practice -f seed.sql                   -- default: 200,000 leads
--   psql -d practice -v leads=20000 -f seed.sql    -- smaller and faster
--
-- It DROPS and recreates these four tables each time, so it is safe to re-run.
-- 200,000 leads takes roughly 10-30 seconds on a laptop.
--
-- On purpose, replies.lead_id and bookings.lead_id have NO index yet.
-- Exercise 4 asks you to measure a query, add the index, and measure again.
-- =====================================================================

\set ON_ERROR_STOP on

-- Default size if you didn't pass -v leads=...
\if :{?leads}
\else
  \set leads 200000
\endif

\echo 'Seeding' :leads 'leads...'

-- Same "random" data every run, so answers are comparable.
SELECT setseed(0.42) \gset

DROP TABLE IF EXISTS events, bookings, replies, leads CASCADE;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

CREATE TABLE leads (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text        NOT NULL UNIQUE                     -- one row per email
              CHECK (email = lower(email) AND email LIKE '%_@_%'),
  full_name   text,                                          -- can be missing
  phone       text,                                          -- can be missing
  suburb      text,
  state       text        CHECK (state IN ('QLD','NSW','VIC','WA','SA','TAS','ACT','NT')),
  source      text        NOT NULL
              CHECK (source IN ('web_form','email','phone','referral','google_ads','facebook')),
  status      text        NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','contacted','replied','booked','lost')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE replies (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     bigint      NOT NULL REFERENCES leads(id) ON DELETE CASCADE,  -- foreign key, no index (yet!)
  channel     text        NOT NULL CHECK (channel IN ('email','sms','phone')),
  body        text        NOT NULL,
  replied_at  timestamptz NOT NULL
);

CREATE TABLE bookings (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id     bigint      NOT NULL REFERENCES leads(id) ON DELETE CASCADE,  -- foreign key, no index (yet!)
  service     text        NOT NULL,
  starts_at   timestamptz NOT NULL,
  status      text        NOT NULL DEFAULT 'confirmed'
              CHECK (status IN ('confirmed','completed','cancelled','no_show')),
  value_aud   numeric(10,2) NOT NULL CHECK (value_aud >= 0),
  created_at  timestamptz NOT NULL
);

-- Raw webhook events. The primary key is (provider, event_id): the provider's
-- own id, so a duplicate delivery hits the constraint instead of creating a new row.
CREATE TABLE events (
  provider        text        NOT NULL,
  event_id        text        NOT NULL,
  event_type      text        NOT NULL,
  payload         jsonb       NOT NULL,
  occurred_at     timestamptz NOT NULL,                 -- when it happened at the provider
  received_at     timestamptz NOT NULL DEFAULT now(),   -- when we stored it
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','done','failed')),
  attempts        int         NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz,
  last_error      text,
  PRIMARY KEY (provider, event_id)
);

-- ---------------------------------------------------------------------
-- Data
-- ---------------------------------------------------------------------
-- pick(arr) = a random element of an array. Postgres arrays start at 1.
CREATE OR REPLACE FUNCTION pg_temp.pick(arr text[]) RETURNS text
LANGUAGE sql VOLATILE AS $$ SELECT arr[1 + floor(random() * array_length(arr, 1))::int] $$;

-- Leads: spread over the last 365 days.
INSERT INTO leads (email, full_name, phone, suburb, state, source, created_at)
SELECT
  lower(f.first || '.' || f.last || g || '@' || pg_temp.pick(ARRAY['gmail.com','outlook.com','bigpond.com','icloud.com','example.com.au'])),
  CASE WHEN random() < 0.05 THEN NULL ELSE f.first || ' ' || f.last END,          -- 5% no name
  CASE WHEN random() < 0.20 THEN NULL ELSE '04' || lpad((floor(random() * 1e8))::bigint::text, 8, '0') END,  -- 20% no phone
  s.suburb,
  s.state,
  pg_temp.pick(ARRAY['web_form','web_form','web_form','email','email','phone','referral','google_ads','google_ads','facebook']),
  now() - (random() * interval '365 days')
FROM generate_series(1, :leads) AS g
CROSS JOIN LATERAL (
  SELECT pg_temp.pick(ARRAY['Olivia','Jack','Charlotte','Noah','Amelia','William','Isla','Oliver','Mia','Thomas',
                            'Ava','James','Grace','Lucas','Chloe','Henry','Zara','Ethan','Priya','Liam','Mei','Arjun',
                            'Sofia','Hamish','Aisha','Tom']) AS first,
         pg_temp.pick(ARRAY['Smith','Jones','Williams','Brown','Wilson','Taylor','Nguyen','Johnson','Martin','White',
                            'Anderson','Walker','Thompson','Patel','Singh','Chen','Kelly','Ryan','OBrien','Murphy',
                            'Lee','Harris','Clarke','Kaur']) AS last,
         g AS dummy  -- referencing g forces a fresh pick for every row
) f
CROSS JOIN LATERAL (
  SELECT (ARRAY['Paddington','Chermside','Carindale','Indooroopilly','Logan Central','Redcliffe','Newtown',
                'Parramatta','Fitzroy','Geelong','Fremantle','Glenelg','Hobart','Braddon','Darwin City'])[i] AS suburb,
         (ARRAY['QLD','QLD','QLD','QLD','QLD','QLD','NSW','NSW','VIC','VIC','WA','SA','TAS','ACT','NT'])[i] AS state
  FROM (SELECT 1 + floor(random() * 15)::int AS i, g AS dummy) x
) s;

-- Replies: about 40% of leads reply, 1-3 times, within 0-7 days of enquiring.
INSERT INTO replies (lead_id, channel, body, replied_at)
SELECT l.id,
       pg_temp.pick(ARRAY['email','email','sms','phone']),
       pg_temp.pick(ARRAY['Yes please, when can you come out?','Can you send a quote first?',
                          'What does the call-out fee cover?','Is Saturday possible?',
                          'Not right now, thanks','Can you call me after 5pm?','Sounds good, book me in']),
       least(now(), l.created_at + (random() * interval '7 days') + (n * interval '2 hours'))  -- never in the future
FROM (SELECT id, created_at, 1 + floor(random() * 3)::int AS n_replies
      FROM leads WHERE random() < 0.40) l                     -- pick the leads who reply first
CROSS JOIN LATERAL generate_series(1, l.n_replies) AS n;

-- Bookings: about 30% of leads who replied book (referrals book more, Facebook leads less);
-- a few book without replying (they rang instead).
INSERT INTO bookings (lead_id, service, starts_at, status, value_aud, created_at)
SELECT l.id,
       pg_temp.pick(ARRAY['Switchboard upgrade','Lighting install','Power point install','Fault finding',
                          'Smoke alarm compliance','Ceiling fan install']),
       l.created_at + interval '3 days' + (random() * interval '14 days'),
       pg_temp.pick(ARRAY['confirmed','completed','completed','completed','cancelled','no_show']),
       round((150 + random() * 2350)::numeric, 2),
       least(now(), l.created_at + (random() * interval '3 days'))
FROM leads l
WHERE (EXISTS (SELECT 1 FROM replies r WHERE r.lead_id = l.id)
       AND random() < CASE l.source WHEN 'referral' THEN 0.50 WHEN 'phone' THEN 0.40
                                    WHEN 'facebook' THEN 0.15 ELSE 0.30 END)
   OR random() < 0.01;

-- Keep leads.status consistent with what happened.
UPDATE leads l SET status = 'booked'
WHERE EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = l.id);

UPDATE leads l SET status = 'replied'
WHERE l.status = 'new' AND EXISTS (SELECT 1 FROM replies r WHERE r.lead_id = l.id);

UPDATE leads SET status = (ARRAY['new','contacted','contacted','lost'])[1 + floor(random() * 4)::int]
WHERE status = 'new';

-- Events: one 'lead.created' webhook per lead, plus 'lead.updated' for ~30%.
-- Most are processed ('done'); some failed or are still pending, for retry exercises.
INSERT INTO events (provider, event_id, event_type, payload, occurred_at, received_at,
                    status, attempts, next_attempt_at, last_error)
SELECT e.provider, e.event_id, e.event_type, e.payload, e.occurred_at,
       least(now(), e.occurred_at + (random() * interval '90 seconds')),
       e.status,
       CASE e.status WHEN 'pending' THEN 0 WHEN 'failed' THEN 1 + floor(random() * 5)::int ELSE 1 END,
       CASE e.status WHEN 'failed' THEN now() + (random() * interval '2 hours') - interval '1 hour' END,
       CASE e.status WHEN 'failed' THEN pg_temp.pick(ARRAY['HTTP 429 from CRM','HTTP 503 from CRM',
                                                           'timeout after 30s','invalid email']) END
FROM (
  SELECT CASE WHEN l.source IN ('web_form','email') THEN 'webform' ELSE 'adsplatform' END AS provider,
         'evt_' || md5(l.id::text || '-created') AS event_id,
         'lead.created' AS event_type,
         jsonb_build_object('lead', jsonb_build_object('email', l.email, 'name', l.full_name,
                            'phone', l.phone, 'suburb', l.suburb, 'source', l.source),
                            'utm_campaign', pg_temp.pick(ARRAY['spring_sale','brand','switchboards','none'])) AS payload,
         l.created_at AS occurred_at,
         CASE WHEN random() < 0.03 THEN 'failed' WHEN random() < 0.01 THEN 'pending' ELSE 'done' END AS status
  FROM leads l
  UNION ALL
  SELECT 'webform',
         'evt_' || md5(l.id::text || '-updated'),
         'lead.updated',
         jsonb_build_object('lead', jsonb_build_object('email', l.email, 'status', l.status)),
         least(now() - interval '5 minutes', l.created_at + interval '1 day'),
         CASE WHEN random() < 0.03 THEN 'failed' ELSE 'done' END
  FROM leads l
  WHERE random() < 0.30
) e;

-- Refresh planner statistics so EXPLAIN gives sensible plans straight away.
ANALYZE leads;
ANALYZE replies;
ANALYZE bookings;
ANALYZE events;

\echo 'Done. Row counts:'
SELECT 'leads' AS table_name, count(*) AS rows FROM leads
UNION ALL SELECT 'replies',  count(*) FROM replies
UNION ALL SELECT 'bookings', count(*) FROM bookings
UNION ALL SELECT 'events',   count(*) FROM events;
