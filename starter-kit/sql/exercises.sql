-- =====================================================================
-- SQL practice: 10 questions on the starter-kit database
-- =====================================================================
-- First load the data:   psql -d practice -f seed.sql
-- Then open psql:        psql -d practice
-- and write a query under each question. Answers are in answers.sql;
-- try each one yourself first, and only peek when stuck.
--
-- Tables (see seed.sql for the full definitions):
--   leads    (id, email, full_name, phone, suburb, state, source, status, created_at)
--   replies  (id, lead_id -> leads.id, channel, body, replied_at)
--   bookings (id, lead_id -> leads.id, service, starts_at, status, value_aud, created_at)
--   events   (provider, event_id, event_type, payload jsonb, occurred_at, received_at,
--             status, attempts, next_attempt_at, last_error)
--
-- Tip: in psql, type \d leads to see a table's columns and constraints.
-- =====================================================================


-- Q1. Warm-up (SELECT, GROUP BY, ORDER BY)
-- How many leads came from each source? Show the biggest source first.



-- Q2. Filtering by date (WHERE, intervals)
-- How many leads were created in the last 30 days, per state?
-- Hint: now() - interval '30 days'



-- Q3. Joining tables (JOIN)
-- Show the 10 most recently created bookings with the lead's full_name,
-- email, the service and starts_at.



-- Q4. The classic interview query (LEFT JOIN / NOT EXISTS)
-- How many leads replied at least once but never booked?
-- Then list 20 of them, most recent reply first.
-- Watch out: a lead with 3 replies must only be counted once.



-- Q5. Indexes and EXPLAIN ANALYZE
-- a) Run:  EXPLAIN ANALYZE SELECT * FROM replies WHERE lead_id = 4242;
--    Note the plan type (Seq Scan?) and the "Execution Time".
-- b) Add an index on replies(lead_id) and one on bookings(lead_id).
-- c) Run the EXPLAIN ANALYZE again. What changed in the plan and the time?
-- d) Bonus: EXPLAIN ANALYZE your Q4 query before and after the indexes.
-- e) Bonus: why might you NOT index every column? (write your answer as a comment)



-- Q6. Conversion rate (GROUP BY + HAVING)
-- For each source, show: number of leads, number of leads who booked,
-- and the booking rate as a percentage (1 decimal place).
-- Only include sources with more than 1,000 leads. Best rate first.
-- Hint: count(DISTINCT ...) and the 100.0 trick to avoid whole-number division.



-- Q7. Speed to first reply (CTE + aggregates)
-- Using a WITH (CTE), find each lead's FIRST reply time.
-- Then, per source, show the median hours between created_at and that first reply.
-- Hint: percentile_cont(0.5) WITHIN GROUP (ORDER BY ...),
--       and extract(epoch FROM some_interval) / 3600 gives hours.



-- Q8. Running total (window functions)
-- Monthly revenue from bookings with status 'completed':
-- show month, that month's revenue, and a running total across months.
-- Hint: date_trunc('month', starts_at) and SUM(...) OVER (ORDER BY month).



-- Q9. JSONB and retry state (the events table)
-- a) Which failed events are due for another try?
--    (status = 'failed', next_attempt_at <= now(), attempts < 5), oldest first.
--    Show event_id, attempts, last_error and the lead's email from the payload.
--    Hint: payload -> 'lead' ->> 'email'
-- b) Count lead.created events per utm_campaign (it's inside payload).



-- Q10. Upserts and transactions
-- a) Insert a lead with email 'ana.nguyen@example.com' (source 'web_form').
--    If that email already exists, update its phone to '0400000001' instead.
--    Run your statement twice: there must still be exactly ONE row for that email.
--    Hint: INSERT ... ON CONFLICT (email) DO UPDATE SET ...
-- b) In ONE transaction, insert a new lead 'crash.test@example.com' AND a booking
--    for it with value_aud = -50 (this breaks a CHECK constraint, like a crash
--    halfway through). Then show that the lead was NOT saved either.
--    Hint: BEGIN; ... ; ROLLBACK;   and   INSERT ... RETURNING id
