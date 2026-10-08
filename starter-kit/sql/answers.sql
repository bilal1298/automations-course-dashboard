-- =====================================================================
-- Answers for exercises.sql
-- =====================================================================
-- Your answer can look different and still be right. If it returns the
-- same numbers, it's right. You can run this whole file:
--   psql -d practice -f answers.sql
-- Note: Q5 adds two indexes and Q10 adds a lead. Re-run seed.sql to reset.
-- =====================================================================

\set ON_ERROR_STOP on


-- Q1. Leads per source
SELECT source, count(*) AS leads
FROM leads
GROUP BY source
ORDER BY leads DESC;


-- Q2. Leads in the last 30 days, per state
SELECT state, count(*) AS leads_last_30_days
FROM leads
WHERE created_at >= now() - interval '30 days'
GROUP BY state
ORDER BY leads_last_30_days DESC;


-- Q3. 10 most recent bookings with lead details
SELECT b.created_at, l.full_name, l.email, b.service, b.starts_at
FROM bookings b
JOIN leads l ON l.id = b.lead_id
ORDER BY b.created_at DESC
LIMIT 10;


-- Q4. Replied but never booked
-- Version 1: NOT EXISTS (clear, and never double-counts)
SELECT count(*) AS replied_never_booked
FROM leads l
WHERE EXISTS     (SELECT 1 FROM replies  r WHERE r.lead_id = l.id)
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = l.id);

-- Version 2: LEFT JOIN ... IS NULL (the classic). DISTINCT stops a lead
-- with 3 replies being counted 3 times.
SELECT count(DISTINCT l.id) AS replied_never_booked
FROM leads l
JOIN replies r       ON r.lead_id = l.id
LEFT JOIN bookings b ON b.lead_id = l.id
WHERE b.id IS NULL;

-- The list: 20 of them, most recent reply first
SELECT l.id, l.full_name, l.email, max(r.replied_at) AS last_reply
FROM leads l
JOIN replies r ON r.lead_id = l.id
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.lead_id = l.id)
GROUP BY l.id, l.full_name, l.email
ORDER BY last_reply DESC
LIMIT 20;


-- Q5. Indexes and EXPLAIN ANALYZE
-- a) Before: expect "Seq Scan on replies" (reads every row).
EXPLAIN ANALYZE SELECT * FROM replies WHERE lead_id = 4242;

-- b) Add the indexes. (IF NOT EXISTS makes this safe to re-run.)
CREATE INDEX IF NOT EXISTS replies_lead_id_idx  ON replies (lead_id);
CREATE INDEX IF NOT EXISTS bookings_lead_id_idx ON bookings (lead_id);

-- c) After: expect "Index Scan" or "Bitmap Index Scan using replies_lead_id_idx"
--    and an execution time many times smaller.
EXPLAIN ANALYZE SELECT * FROM replies WHERE lead_id = 4242;

-- e) Every index must be updated on every INSERT/UPDATE/DELETE and takes disk
--    space, so it slows writes. Index the columns you actually filter or join on.
--    Tip: Postgres does NOT index foreign key columns automatically - you add those.


-- Q6. Booking rate per source
SELECT l.source,
       count(DISTINCT l.id) AS leads,
       count(DISTINCT b.lead_id) AS leads_booked,
       round(100.0 * count(DISTINCT b.lead_id) / count(DISTINCT l.id), 1) AS booking_rate_pct
FROM leads l
LEFT JOIN bookings b ON b.lead_id = l.id
GROUP BY l.source
HAVING count(DISTINCT l.id) > 1000
ORDER BY booking_rate_pct DESC;


-- Q7. Median hours to first reply, per source
WITH first_reply AS (
  SELECT lead_id, min(replied_at) AS first_reply_at
  FROM replies
  GROUP BY lead_id
)
SELECT l.source,
       count(*) AS leads_who_replied,
       round((percentile_cont(0.5) WITHIN GROUP (
         ORDER BY extract(epoch FROM fr.first_reply_at - l.created_at) / 3600
       ))::numeric, 1) AS median_hours_to_first_reply
FROM first_reply fr
JOIN leads l ON l.id = fr.lead_id
GROUP BY l.source
ORDER BY median_hours_to_first_reply;


-- Q8. Monthly completed revenue with a running total
WITH monthly AS (
  SELECT date_trunc('month', starts_at)::date AS month,
         sum(value_aud) AS revenue
  FROM bookings
  WHERE status = 'completed'
  GROUP BY 1
)
SELECT month,
       revenue,
       sum(revenue) OVER (ORDER BY month) AS running_total
FROM monthly
ORDER BY month;


-- Q9a. Failed events due for retry
SELECT event_id, attempts, last_error,
       payload -> 'lead' ->> 'email' AS lead_email,
       next_attempt_at
FROM events
WHERE status = 'failed'
  AND next_attempt_at <= now()
  AND attempts < 5
ORDER BY next_attempt_at
LIMIT 20;

-- Q9b. lead.created events per campaign
SELECT payload ->> 'utm_campaign' AS campaign, count(*) AS events
FROM events
WHERE event_type = 'lead.created'
GROUP BY 1
ORDER BY events DESC;


-- Q10a. Upsert: run it twice, still one row
INSERT INTO leads (email, full_name, source, phone)
VALUES ('ana.nguyen@example.com', 'Ana Nguyen', 'web_form', '0400000001')
ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone;

INSERT INTO leads (email, full_name, source, phone)
VALUES ('ana.nguyen@example.com', 'Ana Nguyen', 'web_form', '0400000001')
ON CONFLICT (email) DO UPDATE SET phone = EXCLUDED.phone;

SELECT count(*) AS rows_for_ana FROM leads WHERE email = 'ana.nguyen@example.com';  -- 1


-- Q10b. All-or-nothing: the booking fails, so the lead disappears too.
-- The ERROR below is EXPECTED - that's the "crash halfway through".
\set ON_ERROR_STOP off
BEGIN;
  INSERT INTO leads (email, full_name, source)
  VALUES ('crash.test@example.com', 'Crash Test', 'web_form');

  INSERT INTO bookings (lead_id, service, starts_at, value_aud, created_at)
  SELECT id, 'Fault finding', now() + interval '2 days', -50, now()   -- breaks CHECK (value_aud >= 0)
  FROM leads WHERE email = 'crash.test@example.com';
ROLLBACK;   -- Postgres has already aborted the transaction; ROLLBACK ends it.
\set ON_ERROR_STOP on

SELECT count(*) AS crash_test_leads FROM leads WHERE email = 'crash.test@example.com';  -- 0
-- Without BEGIN/ROLLBACK, the lead would have been saved without its booking:
-- exactly the half-written state a transaction protects you from.
