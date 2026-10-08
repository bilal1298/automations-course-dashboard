# Starter kit

Many Build exercises in the course would otherwise start from a blank screen. This kit gives you realistic things to build against: a fake CRM API that breaks in realistic ways, a webhook sender, a 200,000-row practice database, and messy test data.

Everything is made up. The businesses, people, emails (all `example.*`) and phone numbers (all in the `555` range) are fictional.

## Get it

```bash
git clone https://github.com/bilal1298/automations-course-dashboard.git
cd automations-course-dashboard/starter-kit
```

You need **Python 3.11 or newer** (check with `python3 --version`). The scripts only use Python's standard library, so there's nothing to install. For the SQL files you need Postgres and `psql`, either installed locally (Postgres.app on a Mac) or from the Docker setup below.

## What's in it, and which module it's for

| Tool | What it is | Use it in |
|---|---|---|
| `mock-api/server.py` | A fake CRM API on your laptop: OAuth tokens that expire, cursor pagination, rate limits (429), random failures, duplicate-creating POST and a safe upsert | **APIs & webhooks module** (pagination, OAuth and revoking access, retries, idempotency, failure injection); **n8n module** (retries, error workflows, batching, rate limits) |
| `webhooks/send_webhook.py` | Sends signed webhooks to any URL, including duplicate, out-of-order, tampered and replayed ones | **APIs & webhooks module** (webhook receiver); **n8n module** (raw events, replay) |
| `webhooks/verify_example.py` | Shows how to check a webhook signature, plus a tiny receiver that does it properly | **APIs & webhooks module** |
| `sql/seed.sql` | Creates `leads`, `replies`, `bookings` and `events` tables, filled with ~200k leads | **SQL module** (all of it) |
| `sql/exercises.sql` + `sql/answers.sql` | 10 practice questions, from SELECT to indexes, window functions, upserts and transactions | **SQL module** |
| `data/enquiries.json` | 40 messy customer enquiries for a fictional Brisbane electrician: duplicates, spam, an angry customer, missing details, a prompt injection | **Client case study project** (your 30+ test inputs) |
| `data/tickets_eval.csv` | 60 support tickets labelled with category and urgency | **LLM module** (golden eval set, accuracy/precision/recall, comparing prompts and models) |
| `data/docs/` + `data/rag_eval.csv` | 8 short policy documents (one with two versions, one with a table, one "poisoned") and 28 test questions with the right document and section | **RAG module** (chunking, hybrid search, retrieval evals, citations, "insufficient evidence") |
| `docker/compose.yaml` | n8n + Postgres in Docker | **n8n module** (self-hosting, backups), and a Postgres for the **SQL module** |

## 1. Fake CRM API

```bash
cd mock-api
python3 server.py                  # http://localhost:8787
```

Open http://localhost:8787/ to see every endpoint. The terminal prints a plain-English line for every request, so keep it visible.

```bash
# Get a token
curl -s -X POST localhost:8787/oauth/token \
  -d grant_type=client_credentials -d client_id=starter-kit -d client_secret=starter-secret

# Use it (paste your access_token)
curl -s "localhost:8787/contacts?limit=50" -H "Authorization: Bearer at_..."
```

What it does:

- **Pagination:** `GET /contacts?limit=50&cursor=...` returns `data`, `next_cursor` and `has_more`. Keep passing `next_cursor` back until `has_more` is `false`. There are 300 contacts.
- **Tokens expire:** after 300 seconds by default (`--token-ttl 30` for 30 seconds). You then get a `401`. Get a new token with `grant_type=refresh_token&refresh_token=rt_...`.
- **Revoked access:** `curl -X POST localhost:8787/admin/revoke` simulates the user disconnecting your app. Calls get `401`, and refreshing gets `400 invalid_grant`. That's the case where retrying is pointless and a person must be alerted. `POST /admin/restore` undoes it.
- **Rate limit:** 10 requests per 10 seconds. The 11th gets `429` with a `Retry-After` header saying how many seconds to wait.
- **Chaos mode:** `python3 server.py --chaos` makes about 30% of requests fail: `500`, `503`, broken JSON, or a reply 20 seconds late (set your client timeout lower than that).
- **Duplicates vs upsert:** `POST /contacts` always creates a new contact, even if the email exists. Send it twice and you have duplicates. `PUT /contacts/upsert` creates or updates by email instead. Add an `Idempotency-Key: some-unique-key` header and repeats of the same request are answered from memory without changing anything.
- `POST /admin/reset` puts all data back to the start.

**Using it from n8n in Docker:** start the server with `python3 server.py --host 0.0.0.0` and use `http://host.docker.internal:8787` as the URL in n8n.

## 2. Webhooks

```bash
cd webhooks
python3 verify_example.py --selftest                 # check the verify function works
python3 verify_example.py --serve --port 9000        # terminal 1: a receiver
python3 send_webhook.py --url http://localhost:9000/ --mode all   # terminal 2
```

`--mode` can be `normal`, `duplicate`, `out-of-order`, `tampered`, `replay` or `all`. Point `--url` at your own n8n Webhook node (for example `http://localhost:5678/webhook-test/leads`) to test your workflow.

Each event has a header `X-Webhook-Signature: t=<timestamp>,v1=<signature>`. The signature is HMAC-SHA256 of `<timestamp>.<raw body>` using the secret `whsec_starter_kit_secret` (change it with `--secret`). In n8n, turn on the Webhook node's **Raw Body** option so you can check the signature against the exact bytes that were sent.

## 3. SQL practice database

```bash
cd sql
psql -d practice -f seed.sql                   # ~200,000 leads, about 10-30 seconds
psql -d practice -v leads=20000 -f seed.sql    # smaller, if your laptop is slow
```

(First create the database once with `createdb practice`. If you use the Docker setup it already exists; see below.)

Then work through `exercises.sql` in `psql -d practice`. Answers are in `answers.sql`; only look once you've tried. Re-running `seed.sql` resets everything. Question 5 makes you time a query with `EXPLAIN ANALYZE`, add an index, and time it again. At the default size the difference is large (around 4 ms down to 0.02 ms on a laptop).

## 4. Test data

- **`data/enquiries.json`**: 40 enquiries arriving by web form, email, SMS, voicemail and Facebook, each with a different shape. Allowed `job_type` values (`lighting`, `switchboard`, `power`, `other`) and urgency levels are at the top of the file. **Write your expected answer for each one before you run your flow**, as the Client case study project asks. Look out for the double-submitted form, the same person writing twice through different channels, the spam, the angry repeat customer, the job outside the service area and the message that tries to give your LLM orders.
- **`data/tickets_eval.csv`**: `id, text, category, urgency` for a fictional rostering app. Categories: `billing`, `bug`, `account_access`, `how_to`, `feature_request`, `cancellation`. A few tickets are deliberately tricky (a message that just says "hi", a refund request caused by an outage, one that tries to give your LLM orders). If you disagree with a label, change it and write down why. That's part of building an eval set.
- **`data/docs/`** and **`data/rag_eval.csv`**: the policies of the same fictional electrician.
  - `warranty-policy-v1.md` and `-v2.md` are two versions of one policy. Most questions want v2, but one deliberately needs v1.
  - `pricing-and-call-out-fees.md` has a table, which chunking often breaks.
  - `supplier-product-notes.md` is **poisoned**: section 3 hides instructions aimed at your AI. A safe system retrieves it without obeying it.
  - In `rag_eval.csv`, rows with `answerable = no` have no correct document. The right response is "insufficient evidence".

## 5. Docker: n8n + Postgres

> Not tested on this machine (Docker wasn't installed when the kit was built). It's a minimal, standard setup, but if something doesn't start, check the n8n docs on Docker Compose.

```bash
cd docker
cp .env.example .env        # then edit the passwords and the encryption key
docker compose up -d
```

- n8n: http://localhost:5678
- Postgres: `localhost:5432`, user and password from your `.env`. n8n's own data is in the `n8n` database; the `practice` database is empty and ready for `seed.sql`:

```bash
docker compose exec -T postgres psql -U n8n -d practice < ../sql/seed.sql
```

(Use your own `POSTGRES_USER` instead of `n8n` if you changed it.)

Back up the `N8N_ENCRYPTION_KEY` in your `.env`. Without it, n8n can't read the credentials it saved.
