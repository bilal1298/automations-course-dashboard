import type { Lesson } from './types';

export const m5: Lesson = {
  intro: "n8n is great at connecting things. But some logic gets too complex, too important or too widely reused to live in a tangle of nodes. That’s when you write a small service of your own, in Python, that n8n calls like any other API. This module teaches FastAPI (the most popular Python tool for this) and Pydantic (which checks data at the door), plus the production habits around them: health checks, secrets, databases, tests and deployment. Job ads often pair “n8n” with “Python/FastAPI”. This module is that bridge.",
  glossary: {
    'api': 'Application Programming Interface: a set of URLs one program offers so other programs can ask it to do things.',
    'web service': 'A program running on a server that listens for HTTP requests and sends back responses.',
    'route': 'The rule in your code linking one method and path (e.g. POST /v1/leads) to the function that handles it.',
    'fastapi': 'A popular Python framework for building APIs. You write functions; it handles HTTP, validation and docs.',
    'uvicorn': 'The server program that runs a FastAPI app and listens for requests on a port.',
    'openapi': 'A standard, machine-readable description of an API’s endpoints, inputs and outputs. FastAPI writes it for you.',
    'pydantic': 'A Python library that checks data against a model you define and converts it to the right types.',
    'schema': 'A description of what valid data looks like: which fields, which types, which are required.',
    'health check': 'An endpoint that answers “are you OK?”, used by monitors and hosting platforms.',
    'backward compatible': 'A change that doesn’t break anyone already using the old version.',
    'dependency injection': 'Your function declares what it needs (settings, a database connection) and the framework hands it over, so tests can swap in fakes.',
    'async': 'Code written so that while one task waits on the network, the program can work on others.',
    'event loop': 'The single coordinator that runs async code, switching to another task whenever one is waiting.',
    'transaction': 'A group of database changes that are all saved together or all undone together.',
    'alembic': 'A Python tool for writing database migrations and applying them in order.',
    'pytest': 'The most common Python testing tool. It runs every function named test_… and reports failures.',
    'testclient': 'FastAPI’s tool for sending pretend requests to your app inside a test, without starting a server.',
    'mock': 'A fake stand-in for a real service in tests, e.g. a CRM that always times out.',
  },
  sections: [
    {
      title: "Why write your own API?",
      minutes: 5,
      body: [
        "**The problem.** You built an n8n workflow that scores leads. It started as one Code node. Now it’s six Code nodes and three IF branches that only you understand. Nobody can test it, two other workflows have copy-pasted the same logic, and a fix applied to one copy never reached the others.",
        "**The idea.** Move that core logic into a small program of your own, a [[web service]]. n8n keeps doing what it’s good at: triggers, routing, connecting apps. When it needs the hard part done, it sends an HTTP request to your service and gets an answer back. Your service is just another [[API]], like HubSpot’s, except you own it.",
        "**The analogy.** A restaurant. n8n is the waiter: takes orders, carries plates, talks to everyone. Your service is the kitchen: one place where the cooking is done properly, behind a hatch with a fixed menu.",
        "Three words you need:",
        "- **[[Endpoint]]**: one URL your service offers, like `/v1/leads/score`.\n- **[[Route]]**: the line in your code that says “a `POST` to this path runs this function”.\n- **Contract**: what an endpoint promises: which data it accepts, what it returns and which errors it can give.",
        "**When is a service worth it?** When logic needs proper tests, is reused by several workflows, needs to scale on its own, or needs a stable contract other people rely on. If a workflow is a few simple steps, keep it in n8n. A service is one more thing to deploy and look after.",
      ],
      example: {
        caption: 'Where the boundary sits',
        code: `n8n:  Webhook (new lead from a form)
n8n:  HTTP Request → POST https://api.yourname.com/v1/leads/score
        sends:    {"email": "ana@acme.com", "company_size": 40}
        receives: {"score": 82, "tier": "hot"}
n8n:  IF tier = hot → Slack #sales, otherwise → CRM nurture list`,
      },
      interview: "I keep orchestration in n8n and move logic into a service when it needs tests, reuse across workflows, independent scaling or a stable contract. The service exposes a small, versioned HTTP API with typed request and response schemas, so n8n treats it like any other integration.",
      check: [
        {
          id: 'm5-s0-1', kind: 'choice',
          prompt: "A client has the same 80-line pricing Code node copied into four workflows. Last month a bug fix reached only two of them. What’s the best move?",
          options: [
            { text: "Move the pricing logic into one service endpoint all four workflows call", why: "Yes. One copy, one place to test and fix, and every workflow gets the fix at once." },
            { text: "Add a comment to each copy listing the other three, so fixes get applied everywhere", why: "People will still forget. The problem is having four copies at all." },
            { text: "Rebuild the logic with IF and Set nodes so non-coders can maintain each copy", why: "That’s still four copies, and node logic is harder to test than code." },
            { text: "Merge the four workflows into one, with a Switch node routing each case", why: "That creates a giant workflow that’s hard to change, and the logic is still untested." },
          ],
          answer: 0,
          explain: "Reuse across workflows is one of the clearest reasons to put logic behind a service boundary.",
        },
        {
          id: 'm5-s0-2', kind: 'choice',
          prompt: "Which of these does **not** justify building your own service?",
          options: [
            { text: "A three-step flow that posts a Slack message when a form is submitted", why: "Right. n8n handles this well, and a service would only add work." },
            { text: "Scoring logic that must be covered by automated tests", why: "Testability is a good reason for a service." },
            { text: "A transformation reused by five different workflows", why: "Reuse is a good reason for a service." },
            { text: "An endpoint another team’s system depends on, whose contract must stay stable", why: "A stable contract is a good reason for a service." },
          ],
          answer: 0,
          explain: "Tests, reuse, independent scaling and a stable contract justify a service. Simple flows stay in n8n.",
        },
      ],
    },
    {
      title: "Your first FastAPI app",
      minutes: 6,
      body: [
        "[[FastAPI]] is a Python framework for building APIs. You write ordinary Python functions; FastAPI handles the HTTP side: reading requests, checking data, sending responses and writing documentation.",
        "In the example, the `@app.get(\"/health\")` line above a function is the route. It means “when a `GET` request arrives at `/health`, run this function”. Whatever the function returns is turned into [[JSON]] and sent back.",
        "To run it you need [[uvicorn]], the server program that listens for requests: `uvicorn main:app --reload` (file `main.py`, object `app`; `--reload` restarts when you save). Then open `http://localhost:8000/docs`. FastAPI has built an interactive page listing every endpoint, from an [[OpenAPI]] description it generates for you. Whoever calls your API can read and try it there.",
        "**[[Status code|Status codes]] are part of your answer.** Pick the one that tells the caller what to do next:",
        "- `200` OK, here’s the result. `201` I created something. `202` Accepted: “got it, I’ll do it in the background”.\n- `401` who are you? `403` you can’t do this. `404` not found. `409` conflicts with something that exists, e.g. a duplicate. `422` your data is invalid (FastAPI sends this automatically).\n- `500` my code broke. `503` I can’t serve you right now, try later.",
        "To send an error, `raise HTTPException(status_code=404, detail=\"Lead not found\")`. To change the success code, set `status_code=201` on the route.",
        "**Health and readiness.** Hosting platforms and monitors need to ask how your service is. Give them two [[health check|health checks]]. `/health` means “the process is running” and returns `200` without touching anything else. `/ready` means “I can actually do work”: it checks critical dependencies like the database and returns `503` if one is down. The platform stops sending traffic to an instance that isn’t ready, without restarting it.",
      ],
      example: {
        caption: 'main.py: a minimal service',
        code: `from fastapi import FastAPI, HTTPException

app = FastAPI()                         # the app object uvicorn runs

@app.get("/health")                     # route: GET /health runs this
def health():
    return {"status": "ok"}             # dict → JSON, status 200

@app.get("/ready")
def ready():
    if not database_is_reachable():     # your own quick check
        raise HTTPException(status_code=503, detail="database unavailable")
    return {"status": "ready"}

@app.get("/v1/leads/{lead_id}")         # {lead_id} is read from the URL
def get_lead(lead_id: int):             # FastAPI turns "42" into the number 42
    lead = find_lead(lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead`,
      },
      interview: "FastAPI maps routes to plain Python functions and generates an OpenAPI spec and interactive docs from the type hints. I use status codes deliberately: 201 for creates, 202 for accepted background work, 4xx for caller errors and 5xx for ours. I expose a liveness endpoint that checks only the process and a readiness endpoint that checks critical dependencies.",
      check: [
        {
          id: 'm5-s1-1', kind: 'choice',
          prompt: "Your `/ready` endpoint starts returning `503`, while `/health` still returns `200`. What does that tell the platform?",
          options: [
            { text: "It’s running but can’t serve requests right now, so stop routing traffic to it until it can", why: "Yes. Alive, but a critical dependency such as the database is unavailable." },
            { text: "The process is unhealthy, so the platform should restart the container to recover", why: "/health still answers 200, so the process is alive. A restart won’t bring the database back." },
            { text: "The service is overloaded, so the platform should start more copies of it", why: "/ready failed on a dependency check. More copies would all fail the same check." },
            { text: "The new release is broken, so the platform should roll back to the last version", why: "Readiness can fail temporarily for a perfectly good version, e.g. while the database is down." },
          ],
          answer: 0,
          explain: "Liveness (/health) asks “is the process running?”. Readiness (/ready) asks “can it serve requests?”.",
        },
        {
          id: 'm5-s1-2', kind: 'choice',
          prompt: "n8n calls `POST /v1/invoices` and your service creates a new invoice and returns it. Which status code fits best?",
          options: [
            { text: "201 Created", why: "Right. A new resource was created." },
            { text: "202 Accepted", why: "202 means “I’ll do it later”. Here the invoice already exists." },
            { text: "204 No Content", why: "204 means no body, but you’re returning the invoice." },
            { text: "409 Conflict", why: "409 is for clashes, like a duplicate, not for success." },
          ],
          answer: 0,
          explain: "200 would work, but 201 tells the caller precisely what happened.",
        },
        {
          id: 'm5-s1-3', kind: 'choice',
          prompt: "Your `/health` endpoint checks the database, the CRM and the LLM provider. During a CRM outage, the platform keeps restarting your service. Why?",
          options: [
            { text: "/health shouldn’t check dependencies; those checks belong in /ready", why: "Yes. A CRM outage made the health check fail, so the platform “fixed” it by restarting, which can’t help." },
            { text: "The health check’s timeout is too short for the CRM’s slow responses during the outage", why: "During an outage the CRM check fails whatever the timeout, so the restarts continue." },
            { text: "/health should return 200 even when a check fails, and log the error instead", why: "Then the check means nothing. Remove the dependency checks from /health instead." },
            { text: "/health should retry the CRM check a few times before reporting a failure", why: "An outage outlasts a few retries, so the check still fails and the platform still restarts." },
          ],
          answer: 0,
          explain: "Restarting can’t fix someone else’s outage. Keep liveness simple.",
        },
      ],
    },
    {
      title: "Pydantic: checking data at the door",
      minutes: 6,
      body: [
        "**The problem.** n8n sends your service a lead. Sometimes `email` is missing; sometimes `company_size` is `\"forty\"`. If your code trusts it, it crashes halfway through, maybe after writing half a record. It’s better to reject bad data at the door, before doing anything.",
        "[[Pydantic]] lets you describe valid data as a Python class, called a model. FastAPI uses it automatically: declare the model as the function’s input and every request is checked against it. If something’s wrong, the caller gets `422` with a list of which field failed and why. Your function only ever runs with clean data.",
        "Things to notice in the example:",
        "- `EmailStr`, `Field(ge=1)` and `Literal[...]` add rules beyond the type: a valid email shape, a number of at least 1, one of a fixed set of values.\n- Pydantic **converts** where it safely can: the text `\"40\"` becomes the number `40`. Text like `\"forty\"` is rejected.\n- `response_model` is a [[schema]] for what you **send back**. FastAPI filters the output to those fields, so an internal field like a cost never leaks out by accident.",
        "**Validate on the way out too.** Before you send data on to a CRM, check it against a model of what the CRM expects. The rule: validate the thing you’re about to send, not just what arrived.",
        "**Contracts that last.** Once workflows depend on your endpoint, changing it can break them silently. So put a version in the path (`/v1/...`) and keep changes [[backward compatible]]. Adding an optional field is fine. Renaming or removing a field, or making an optional one required, is a breaking change: it goes into `/v2` while `/v1` keeps working. Error responses are part of the contract too: a clear message the caller can act on, never an internal stack trace.",
      ],
      example: {
        caption: 'Request and response models',
        code: `from typing import Literal
from pydantic import BaseModel, EmailStr, Field

class LeadIn(BaseModel):                # what callers must send
    email: EmailStr                     # needs: pip install "pydantic[email]"
    company_size: int = Field(ge=1)     # whole number, at least 1
    source: Literal["form", "ads", "referral"]
    notes: str | None = None            # optional

class ScoreOut(BaseModel):              # what we promise to return
    score: int
    tier: Literal["hot", "warm", "cold"]

@app.post("/v1/leads/score", response_model=ScoreOut)
def score_lead(lead: LeadIn):           # body is validated before this runs
    return calculate_score(lead)`,
      },
      interview: "I define Pydantic models for every request and response, so invalid input is rejected with a 422 before any side effects, and response_model stops internal fields leaking. I also validate outgoing payloads before calling providers. Endpoints are versioned under /v1; adding optional fields is non-breaking, and anything that removes or renames fields goes to a new version.",
      check: [
        {
          id: 'm5-s2-1', kind: 'choice',
          prompt: "n8n sends this to the endpoint in the example. What happens?",
          code: '{"email": "ana@acme.com", "company_size": "forty", "source": "form"}',
          options: [
            { text: "FastAPI returns 422 naming company_size; score_lead never runs", why: "Yes. Validation happens before your function is called." },
            { text: "Pydantic converts \"forty\" to 40 and score_lead runs normally", why: "It converts “40”, but it doesn’t understand number words." },
            { text: "score_lead runs, then crashes when it does maths on the text value", why: "The model stops the request before your code sees it." },
            { text: "The service returns 500 because the type conversion raised an exception", why: "A failed conversion is a validation error. Invalid input is the caller’s problem, so it’s 422." },
          ],
          answer: 0,
          explain: "Reject early, with an error that tells the caller exactly which field to fix.",
        },
        {
          id: 'm5-s2-2', kind: 'choice',
          prompt: "Several n8n workflows call `/v1/leads/score`. Which change is safe **without** a new version?",
          options: [
            { text: "Accepting a new optional field, campaign", why: "Right. Old callers don’t send it, and nothing breaks." },
            { text: "Renaming tier to category in the response", why: "Workflows reading tier would silently get nothing." },
            { text: "Making the optional notes field required", why: "Old callers that don’t send notes would start getting 422s." },
            { text: "Removing score from the response", why: "Any workflow using score breaks." },
          ],
          answer: 0,
          explain: "Additive and optional = backward compatible. Anything else goes to /v2.",
        },
      ],
    },
    {
      title: "Receiving signed webhooks, then handing off the work",
      minutes: 6,
      body: [
        "Your service can also be the thing a provider calls: Stripe, a form tool or a CRM sends a [[webhook]] to your endpoint. Two rules from the APIs & webhooks module now become code: **prove it’s genuine**, and **reply fast**.",
        "**Prove it’s genuine.** The provider signs each webhook: it makes an [[HMAC]] fingerprint of the exact request body using a secret you both know, and sends it in a header. You compute the same fingerprint and compare. The trap: compute it from the **raw bytes** exactly as received (`await request.body()`). If you parse the JSON first and turn it back into text, spacing or key order can change and the [[signature]] won’t match. Verify first, parse second. If the provider also signs a timestamp, reject old ones to block [[replay attack|replays]].",
        "**Reply fast.** Providers wait only a few seconds for your reply, then retry. If you call an LLM and a CRM before replying, you’ll time out and receive the same event again. So the endpoint does only this:",
        "1. Verify the signature, and reply `401` if it’s wrong.\n2. Save the event under the provider’s event ID, with a [[unique constraint]], so a duplicate delivery is spotted.\n3. Put a job on a [[queue]] for a [[worker]] to do the slow part.\n4. Reply `202 Accepted` straight away.",
        "If the caller needs the result later (say n8n is waiting for a scoring job), return a **job ID** in the `202` response and offer `GET /v1/jobs/{id}` so it can check progress.",
        "**Why not FastAPI’s `BackgroundTasks`?** It runs your function in the same process, just after the response is sent. That’s fine for small, losable jobs like a log line. But if the process restarts or crashes, the job is simply gone, and there are no retries. A real queue stores each job durably, retries failures, and lets several workers share the load. Interviewers often ask about this difference.",
        "`hmac.compare_digest` compares in a way that takes the same time whether the first or last character differs, so attackers can’t guess the signature piece by piece.",
      ],
      example: {
        caption: 'A signed-webhook endpoint (header name differs per provider)',
        code: `import hashlib, hmac
from fastapi import Request, HTTPException

@app.post("/v1/webhooks/forms", status_code=202)
async def receive_form(request: Request):
    raw = await request.body()                       # exact bytes, unparsed
    sent = request.headers.get("X-Signature", "")
    expected = hmac.new(WEBHOOK_SECRET, raw, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sent, expected):      # safe comparison
        raise HTTPException(status_code=401, detail="bad signature")

    event = FormEvent.model_validate_json(raw)       # now parse with Pydantic
    is_new = save_event_once(event.id, raw)          # unique on event ID
    if is_new:
        enqueue("process_form", event.id)            # worker does the slow part
    return {"accepted": True, "event_id": event.id}`,
      },
      interview: "The webhook handler verifies the HMAC over the raw body with a constant-time compare and checks any signed timestamp, persists the event under a unique provider event ID, enqueues a job and returns 202 well within the provider’s timeout. Processing happens in idempotent workers, and callers that need the outcome get a job ID to poll.",
      check: [
        {
          id: 'm5-s3-1', kind: 'choice',
          prompt: "Signature checks fail for every genuine webhook. What’s wrong?",
          code: `data = await request.json()
body = json.dumps(data).encode()
expected = hmac.new(SECRET, body, hashlib.sha256).hexdigest()`,
          options: [
            { text: "It hashes re-encoded JSON, not the raw bytes the provider signed", why: "Yes. json.dumps can change spacing and order, so the fingerprint differs. Use await request.body()." },
            { text: "SHA-256 is the wrong choice; webhook signatures normally use MD5", why: "SHA-256 is the usual choice. The bug is which bytes are hashed." },
            { text: "request.json() consumes the body, so the hash is over empty bytes", why: "FastAPI keeps the body available after reading it. The hash is over different bytes, not empty ones." },
            { text: "It should hash the parsed dict directly rather than encoded bytes", why: "HMAC only works on bytes, and they must be the exact bytes the provider signed." },
          ],
          answer: 0,
          explain: "Verify the raw body first, then parse.",
        },
        {
          id: 'm5-s3-2', kind: 'order',
          prompt: "Put the webhook endpoint’s steps in order.",
          items: ["Verify the signature on the raw body", "Save the event under its unique event ID", "Put a job on the queue", "Reply 202 Accepted"],
          explain: "Verify, persist, enqueue, acknowledge. The slow work happens in a worker afterwards.",
        },
        {
          id: 'm5-s3-3', kind: 'choice',
          prompt: "Each webhook from your form tool arrives three times. Your logs show the handler takes 25 seconds because it calls an LLM before replying. What’s the fix?",
          options: [
            { text: "Reply 202 right after saving and enqueuing; call the LLM in a worker", why: "Yes. The provider gets a fast reply and stops retrying." },
            { text: "Raise the form tool’s webhook timeout so it waits the full 25 seconds", why: "Most providers don’t let you, and any slower LLM day brings the retries back." },
            { text: "Switch to a faster LLM so the handler finishes within the provider’s timeout", why: "It might help a little, but any slow response will still trigger retries." },
            { text: "Deduplicate on the event ID so the second and third copies are ignored", why: "You do need deduplication, but you’d still be timing out on every event." },
          ],
          answer: 0,
          explain: "Separate intake from processing.",
        },
      ],
    },
    {
      title: "Settings, secrets and dependency injection",
      minutes: 6,
      body: [
        "**The problem.** Your service needs a database address, a webhook secret and an API key. Typing them into the code is how keys end up on GitHub. It also means you can’t use a test database in development and the real one in production without editing code.",
        "**Settings come from the environment.** Store each value in an [[environment variable]] (locally, in a `.env` file you never commit). The `pydantic-settings` library reads them into a model at start-up and checks them. If `DATABASE_URL` is missing, the app refuses to start with a clear error, instead of failing on the first real request at 3am. A field marked `SecretStr` stays hidden if settings are printed or logged.",
        "**[[Dependency injection]]** sounds harder than it is. Instead of each function grabbing what it needs from global variables, it **declares** what it needs and FastAPI hands it over. Write `Depends(get_settings)` in a function’s inputs; FastAPI calls `get_settings()` and passes in the result. Two benefits:",
        "- **Reuse.** A check like “is the API key valid?” is written once and added to any route.\n- **Testing.** In tests you swap a dependency for a fake with `app.dependency_overrides`, e.g. a CRM client that always times out, without touching the route.",
        "**Two separate checks.** Authentication asks *who is calling?* (does the `X-API-Key` header match?). Authorisation asks *may they do this?* (can this client see this tenant’s data?). A valid key isn’t permission for everything.",
        "**Keep routes thin.** A route checks input, calls a plain Python function that holds the business logic, and returns the result. That function knows nothing about HTTP, so it’s easy to test and reuse. Don’t build layers of abstraction before you have a second real use for them.",
      ],
      example: {
        caption: 'Typed settings and an API-key dependency',
        code: `import secrets
from functools import lru_cache
from typing import Annotated
from fastapi import Depends, Header, HTTPException
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str                   # read from DATABASE_URL
    service_api_key: SecretStr          # from SERVICE_API_KEY, hidden in logs
    model_config = SettingsConfigDict(env_file=".env")

@lru_cache                              # build settings once, then reuse
def get_settings() -> Settings:
    return Settings()

def require_api_key(
    x_api_key: Annotated[str, Header()],                  # the X-API-Key header
    settings: Annotated[Settings, Depends(get_settings)],
):
    if not secrets.compare_digest(x_api_key, settings.service_api_key.get_secret_value()):
        raise HTTPException(status_code=401, detail="invalid API key")

@app.post("/v1/leads/score", dependencies=[Depends(require_api_key)])
def score_lead(lead: LeadIn): ...`,
      },
      interview: "Configuration comes from environment variables loaded into a typed pydantic-settings model that fails fast at start-up, with secrets as SecretStr so they don’t leak into logs. Shared concerns like settings, database sessions and API-key auth are FastAPI dependencies, which I override in tests. Authentication identifies the caller; authorisation is a separate check on what they may access.",
      check: [
        {
          id: 'm5-s4-1', kind: 'choice',
          prompt: "You deploy the service but forget to set `DATABASE_URL`. Using the Settings class from the example, what happens?",
          options: [
            { text: "The app refuses to start, with an error naming database_url", why: "Yes. Failing fast at deploy time beats failing on a real request later." },
            { text: "It starts and connects to a local Postgres on localhost by default", why: "There’s no default in the class, so the field is required." },
            { text: "It starts normally, and the first request that queries the database fails", why: "Settings are checked when they’re created at start-up, before any query." },
            { text: "It starts with database_url set to None, since no value was provided", why: "Only a field typed as optional with a default of None behaves like that. This one is required." },
          ],
          answer: 0,
          explain: "Typed settings turn a 3am mystery into an obvious deploy error.",
        },
        {
          id: 'm5-s4-2', kind: 'choice',
          prompt: "You want a test where the CRM times out, without calling the real CRM. The route gets its CRM client via `Depends(get_crm)`. What do you do?",
          options: [
            { text: "Override get_crm in app.dependency_overrides with a fake that times out", why: "Right. The route runs unchanged, with a fake swapped in." },
            { text: "Have the route read a TEST_MODE variable and skip the real CRM call", why: "Test-only branches in production code are fragile, and they test a different path. Overrides exist for this." },
            { text: "Point the CRM URL at an unreachable address in the test settings", why: "Slow and unpredictable: depending on the network you may get “refused” instead of a timeout." },
            { text: "Set a 1 ms timeout on the real CRM client during tests so every call times out", why: "It still calls the real CRM, and a fast response could slip through. Flaky tests get ignored." },
          ],
          answer: 0,
          explain: "Dependencies make the outside world swappable, which is what makes failure paths testable.",
        },
        {
          id: 'm5-s4-3', kind: 'choice',
          prompt: "Client A’s valid API key requests `/v1/tenants/B/leads` and gets client B’s leads back. What’s missing?",
          options: [
            { text: "An authorisation check that this caller may access tenant B", why: "Yes. The key proves who they are, not what they may see." },
            { text: "Rate limiting, so one client can’t pull another tenant’s data in bulk", why: "Rate limits slow callers down; they don’t decide what a caller may see." },
            { text: "A separate API key per endpoint, instead of one key per client", why: "More keys still only prove who is calling, not which tenant they may read." },
            { text: "Validating the tenant ID in the path with a Pydantic model", why: "“B” is a perfectly valid tenant ID. Shape validation doesn’t check permission." },
          ],
          answer: 0,
          explain: "Authentication = who you are. Authorisation = what you may do. You need both.",
        },
      ],
    },
    {
      title: "Async, Postgres and migrations",
      minutes: 7,
      body: [
        "**Async in one idea.** Most of a service’s time is spent waiting: for the database, a CRM or an LLM. With [[async]] code, while one request waits on the network, the same process works on others. Like a chef who chops vegetables while the water boils, instead of staring at the pot.",
        "In FastAPI you write `async def` and put `await` in front of anything that waits, e.g. `await client.get(url)` using the `httpx.AsyncClient` library. One coordinator, the [[event loop]], switches between requests at each `await`.",
        "**Where async doesn’t help, or hurts:**",
        "- A **blocking** call inside `async def` (the `requests` library, `time.sleep`, a database driver without async support) freezes the event loop, so *every* request waits. Use async libraries, or write a plain `def` route: FastAPI runs those in a separate thread pool.\n- **CPU-heavy work** (parsing a 200-page PDF) isn’t waiting, it’s working. Async can’t speed it up. Send it to a [[worker]].\n- Async doesn’t make a slow LLM faster. Long jobs still belong on a queue.",
        "**Postgres and transactions.** Some changes must happen together: save the invoice *and* mark the order billed. A [[transaction]] wraps them so both are saved or neither is. If the code fails between the two, the database undoes the first. But a transaction covers only the database. It can’t un-send an email or undo a CRM call made in the middle.",
        "**Migrations.** Your tables will change. Don’t type `ALTER TABLE` into production by hand as your normal way of working. Write a [[migration]] with [[Alembic]]: `alembic revision -m \"add phone to leads\"` creates a file with an `upgrade()` and a `downgrade()` function, and `alembic upgrade head` applies every pending one in order. The files live in Git, so every environment gets the same changes in the same order.",
      ],
      example: {
        caption: 'A transactional service method (psycopg 3)',
        code: `import psycopg

def bill_order(conn: psycopg.Connection, order_id: int, amount: int):
    with conn.transaction():            # all or nothing
        conn.execute(
            "INSERT INTO invoices (order_id, amount) VALUES (%s, %s)",
            (order_id, amount),         # values passed separately, never pasted in
        )
        conn.execute(
            "UPDATE orders SET status = 'billed' WHERE id = %s",
            (order_id,),
        )
    # if either statement fails, neither change is saved`,
      },
      interview: "I use async handlers with async clients for network-bound I/O and keep blocking calls off the event loop; CPU-bound or long jobs go to workers. Related writes share one database transaction, which doesn’t cover external side effects. Schema changes are Alembic migrations in version control, applied as part of each release, never manual edits in production.",
      check: [
        {
          id: 'm5-s5-1', kind: 'choice',
          prompt: "Under load, every request to this service becomes slow, even `/health`. Why?",
          code: `@app.post("/v1/enrich")
async def enrich(lead: LeadIn):
    r = requests.get(CLEARBIT_URL, params={"email": lead.email}, timeout=10)
    return r.json()`,
          options: [
            { text: "requests blocks, so inside async def it freezes the event loop for every request", why: "Yes. Use httpx.AsyncClient with await, or make the route a plain def." },
            { text: "Each 10-second call holds a thread, and the thread pool runs out", why: "async def routes don’t use the thread pool. The blocking call runs on the event loop itself." },
            { text: "Validating LeadIn with Pydantic is slow under load and queues requests", why: "Validation is fast; the blocked event loop is the problem." },
            { text: "async def routes run one at a time unless uvicorn is started with --workers", why: "They run concurrently, as long as nothing blocks the loop. More workers only spread the same problem." },
          ],
          answer: 0,
          explain: "In async code, one blocking call stalls every request.",
        },
        {
          id: 'm5-s5-2', kind: 'choice',
          prompt: "Inside one transaction, your code inserts an invoice, sends the customer an email, then the order update fails. What’s the end state?",
          options: [
            { text: "The invoice insert is rolled back, but the email has already been sent", why: "Right. The database undoes its part; the email is outside its control." },
            { text: "Everything is undone, including the email, because it was inside the transaction", why: "A transaction only covers the database. It can’t recall an email." },
            { text: "The invoice stays saved, because the failure came after it was inserted", why: "That’s exactly what the transaction prevents: all or nothing." },
            { text: "Postgres retries the failed update, so the order ends up billed", why: "A failed transaction rolls back; it doesn’t retry by itself." },
          ],
          answer: 0,
          explain: "Keep external side effects out of the transaction, e.g. record “email to send” and let a worker send it after commit.",
        },
      ],
    },
    {
      title: "Calling it from n8n, testing and deploying",
      minutes: 7,
      body: [
        "**Calling it from n8n.** Use an **HTTP Request** node:",
        "- Method `POST`, URL `https://api.yourname.com/v1/leads/score`. If both run in the same Docker Compose stack, use the service name instead, e.g. `http://api:8000/v1/leads/score`.\n- Authentication: *Generic Credential Type → Header Auth*, header name `X-API-Key`. The key lives in n8n’s credentials, not in the node.\n- Body: JSON built from the incoming item.\n- Set a [[timeout]] in the node’s options, and turn on *Retry On Fail* only for calls that are safe to repeat. For calls that create something, send an [[idempotency key]] (e.g. the lead ID) so a retry doesn’t create it twice.",
        "**Testing.** [[pytest]] runs any function named `test_…`. FastAPI’s [[TestClient]] sends pretend requests to your app without starting a server. Test the happy path *and* the failures: a valid call returns `200`, an invalid payload `422`, a wrong key `401`, and a CRM timeout returns whatever you designed (here `503`). For the timeout, swap the real CRM client for a [[mock]] that raises one.",
        "**Deploying.** Package the service with a [[Dockerfile]] whose start command is `uvicorn main:app --host 0.0.0.0 --port 8000` (`0.0.0.0` makes it reachable from outside the container). Each release: run `alembic upgrade head`, start the new version, wait for `/ready` to return `200`, then send it traffic. Put it behind HTTPS and keep secrets in the host’s environment variables.",
        "**Proof for your portfolio.** Against the deployed service, show four calls: an invalid payload rejected, a bad key refused, a good call succeeding, and a provider timeout handled cleanly.",
      ],
      example: {
        caption: 'test_api.py (TestClient needs httpx installed; SERVICE_API_KEY=test-key in the test env)',
        code: `import httpx
from fastapi.testclient import TestClient
from main import app, get_crm

client = TestClient(app)
KEY = {"X-API-Key": "test-key"}
LEAD = {"email": "ana@acme.com", "company_size": 40, "source": "form"}

def test_rejects_bad_payload():
    r = client.post("/v1/leads/score", json={"email": "nope"}, headers=KEY)
    assert r.status_code == 422

def test_refuses_wrong_key():
    r = client.post("/v1/leads/score", json=LEAD, headers={"X-API-Key": "wrong"})
    assert r.status_code == 401

class TimeoutCRM:                       # fake CRM that always times out
    def find_company(self, domain):
        raise httpx.TimeoutException("simulated")

def test_crm_timeout_returns_503():
    app.dependency_overrides[get_crm] = lambda: TimeoutCRM()
    r = client.post("/v1/leads/score", json=LEAD, headers=KEY)
    app.dependency_overrides.clear()
    assert r.status_code == 503`,
      },
      interview: "n8n calls the service through an HTTP Request node with header-auth credentials, explicit timeouts and retries only on idempotent calls. I test with pytest and TestClient, covering validation errors, auth failures and provider timeouts by overriding dependencies with fakes. Deployment is a container behind HTTPS, with migrations as a release step and traffic gated on the readiness check.",
      check: [
        {
          id: 'm5-s6-1', kind: 'choice',
          prompt: "n8n and your API run in the same Docker Compose stack. The HTTP Request node to `http://localhost:8000/v1/leads/score` fails with “connection refused”. What’s the fix?",
          options: [
            { text: "Call the Compose service name instead, e.g. http://api:8000", why: "Yes. Inside n8n’s container, localhost means n8n itself." },
            { text: "Use http://127.0.0.1:8000, since localhost may resolve to IPv6", why: "127.0.0.1 is still n8n’s own container, so nothing is listening there either." },
            { text: "Publish the API’s port in Compose with \"8000:8000\"", why: "That exposes the API to the host machine, not to localhost inside n8n’s container." },
            { text: "Start uvicorn with --host 0.0.0.0 so it accepts outside connections", why: "The API needs that too, but n8n is still dialling its own container. The URL is the problem." },
          ],
          answer: 0,
          explain: "Containers reach each other by service name.",
        },
        {
          id: 'm5-s6-2', kind: 'order',
          prompt: "Order a safe release of a new API version.",
          items: ["Build the new image", "Run alembic upgrade head", "Start the new version", "Wait for /ready to return 200", "Send it traffic"],
          explain: "The database is ready before the code that needs it, and traffic arrives only once the service says it’s ready. Migrating first is only safe when the migration is backward compatible (expand, then contract), because the old version keeps running against the new schema until the switch.",
        },
      ],
    },
  ],
  quiz: [
    {
      id: 'm5-q1', kind: 'choice',
      prompt: "A Slack notification flow has three nodes and works fine. A colleague wants to rewrite it as a FastAPI service “to be professional”. What do you say?",
      options: [
        { text: "Keep it in n8n; a service would add upkeep without solving a problem", why: "Yes. Services earn their place through tests, reuse, scaling or a stable contract." },
        { text: "Rewrite it, because a typed service is easier to monitor and alert on than n8n", why: "n8n already shows failed executions, and a service is one more thing to deploy and monitor." },
        { text: "Rewrite it, so the logic is covered by tests before it grows", why: "Three simple nodes have nothing worth testing yet. Move it when a real need appears." },
        { text: "Move it into a single Code node so all the logic sits in one place", why: "That makes a simple, readable flow harder to follow, with no gain." },
      ],
      answer: 0,
      explain: "Use a service boundary when it solves a specific problem.",
    },
    {
      id: 'm5-q2', kind: 'choice',
      prompt: "n8n gets this back from your service. What should you change?",
      code: `422 Unprocessable Entity
{"detail": [{"loc": ["body", "company_size"],
             "msg": "Input should be greater than or equal to 1"}]}`,
      options: [
        { text: "Fix the workflow so it sends a company_size of 1 or more for every lead", why: "Yes. The service rejected the input and told you exactly which field and why." },
        { text: "Relax the Field(ge=1) rule in the service so the value is accepted", why: "A company of zero people is bad data. Loosening the rule lets it break something later." },
        { text: "Turn on Retry On Fail, since a 422 can be a temporary server error", why: "422 is a deliberate rejection of the input. The same data is rejected every time." },
        { text: "Check the service logs for the exception that caused the 422", why: "Nothing crashed. The response body already says which field failed and why." },
      ],
      answer: 0,
      explain: "4xx = fix the request. Pydantic’s error says where to look.",
    },
    {
      id: 'm5-q3', kind: 'choice',
      prompt: "Your response accidentally includes an `internal_cost` field that clients shouldn’t see. What prevents this?",
      options: [
        { text: "A response_model listing only the fields you promise to return", why: "Yes. FastAPI filters the output to the model’s fields." },
        { text: "A stricter Pydantic model on the request body that rejects extra fields", why: "That checks what comes in, not what goes out." },
        { text: "Typing internal_cost as SecretStr so it’s hidden in the output", why: "SecretStr masks the value in logs and printing; it isn’t a way to control which fields a response includes." },
        { text: "Adding include_in_schema=False to the route so it’s undocumented", why: "That hides the route from /docs. The field is still returned." },
      ],
      answer: 0,
      explain: "Schemas on the way out are as important as schemas on the way in.",
    },
    {
      id: 'm5-q4', kind: 'choice',
      prompt: "You need to rename `tier` to `segment` in the response of `/v1/leads/score`. Ten workflows use it. What’s the safe approach?",
      options: [
        { text: "Add /v2 with segment and keep /v1 unchanged until every caller has moved", why: "Yes. Renaming is a breaking change; versioning lets callers move when ready." },
        { text: "Rename it in /v1 and send release notes to every workflow owner", why: "Some workflow will be missed and break silently the moment you deploy." },
        { text: "Rename it in /v1 and add a response header saying the field changed", why: "Workflows read fields, not headers. They’ll just get an empty tier." },
        { text: "Rename it in /v1 at a quiet time and fix any workflows that break", why: "Breaking production to find callers is a bad trade, and silent breakages may not show up for days." },
      ],
      answer: 0,
      explain: "Additive changes stay in /v1; breaking changes get a new version.",
    },
    {
      id: 'm5-q5', kind: 'choice',
      prompt: "The same Stripe event is delivered twice, and your service charges the customer’s loyalty points twice. What should have stopped it?",
      options: [
        { text: "A unique constraint on the event ID, skipping duplicate deliveries", why: "Yes. The second delivery is recognised and ignored." },
        { text: "Verifying the signature, so the replayed second delivery is rejected", why: "Both deliveries are genuine, so both pass the signature check." },
        { text: "Rejecting events whose signed timestamp is over five minutes old", why: "Genuine retries are signed afresh, so they pass a timestamp check too." },
        { text: "Replying 200 instead of 202, so Stripe treats it as fully processed", why: "Stripe accepts any 2xx. Webhooks are delivered at least once, so duplicates still happen." },
      ],
      answer: 0,
      explain: "Webhooks arrive at least once. Deduplicate on the provider’s event ID.",
    },
    {
      id: 'm5-q6', kind: 'choice',
      prompt: "Someone committed the CRM API key in `main.py` to a public GitHub repo. What’s the full fix?",
      options: [
        { text: "Revoke and replace the key, move it to an env var, and check the provider’s usage logs for misuse", why: "Yes. Once public, the old key must be treated as stolen, and the logs show whether anyone used it." },
        { text: "Delete the key in a new commit and move it into an environment variable", why: "The key is still in the Git history, and bots scan public repos within minutes. It must be revoked." },
        { text: "Rewrite the Git history to purge the key, then force-push the cleaned repo", why: "Copies may already exist. Cleaning history doesn’t un-leak the key; revoking it does." },
        { text: "Make the repo private and rotate the key at the next scheduled rotation", why: "It may already have been copied. Waiting leaves a stolen key working." },
      ],
      answer: 0,
      explain: "Leaked secrets get revoked and replaced, and you check the provider’s usage logs for misuse. New secrets live in the environment, never in code.",
    },
    {
      id: 'm5-q7', kind: 'choice',
      prompt: "A route parses a 300-page PDF (pure computation, no waiting) and takes 40 seconds. A teammate suggests changing it to `async def`. Will that help?",
      options: [
        { text: "No. Parsing is computing, not waiting, so async can’t help; move it to a worker", why: "Yes. Async helps with waiting, not computing." },
        { text: "Yes, because async def runs the parsing on a separate thread", why: "async def runs on the event loop. A long computation there blocks every other request." },
        { text: "Yes, if the parsing function is awaited so other requests can run", why: "You can only usefully await operations that wait. Pure computation never hands control back." },
        { text: "No, but a plain def would make it faster, because it runs in a thread pool", why: "A plain def keeps the event loop free, but the parse still takes 40 seconds. Long jobs belong on a queue." },
      ],
      answer: 0,
      explain: "Waiting → async. Heavy computing or long jobs → a worker.",
    },
    {
      id: 'm5-q8', kind: 'choice',
      prompt: "Which operations belong in one database transaction?",
      options: [
        { text: "Inserting an invoice and marking its order as billed", why: "Yes. Two related database writes that must succeed or fail together." },
        { text: "Inserting an invoice and emailing the customer its PDF", why: "An email can’t be rolled back. Record the intent and send it after commit." },
        { text: "Calling the CRM, then saving the ID the CRM returns", why: "The CRM call can’t be rolled back, so a transaction can’t make the pair all-or-nothing." },
        { text: "Reading the order, then charging the payment provider", why: "The charge happens outside the database. A rollback can’t refund it." },
      ],
      answer: 0,
      explain: "Transactions make database writes all-or-nothing. External effects need separate handling.",
    },
    {
      id: 'm5-q9', kind: 'choice',
      prompt: "A teammate added a column in production with a quick `ALTER TABLE`. What problem does this create?",
      options: [
        { text: "Git and other environments don’t know about it, so later migrations may clash", why: "Yes. Migrations in Git keep every environment in step." },
        { text: "ALTER TABLE locks the table, so adding the column blocks writes for hours", why: "Adding a nullable column is usually near-instant in Postgres. The real issue is that nothing tracks it." },
        { text: "Nothing, as long as someone writes the matching Alembic migration in the next sprint", why: "That migration would then fail in production, because the column already exists there." },
        { text: "Alembic will notice the extra column and drop it on the next upgrade", why: "alembic upgrade only runs migration files; it doesn’t compare against the live database." },
      ],
      answer: 0,
      explain: "Write an Alembic migration, commit it, and apply it with alembic upgrade head everywhere.",
    },
    {
      id: 'm5-q10', kind: 'choice',
      prompt: "Which test proves your service handles a CRM outage well?",
      options: [
        { text: "Override the CRM dependency with a fake that times out, then assert your response", why: "Yes. It tests the failure path every time, without the real CRM." },
        { text: "Run the happy-path test against the staging CRM with a short timeout", why: "Whether it fails depends on staging’s speed that day. Not repeatable." },
        { text: "Use a pytest retry plugin so the test passes once the CRM recovers", why: "That hides failures rather than testing how the service handles them." },
        { text: "Unit-test calculate_score with a missing company record and check it returns a fallback", why: "It covers a helper, not what the route actually returns when the CRM call fails." },
      ],
      answer: 0,
      explain: "Mock the provider to make failures repeatable.",
    },
    {
      id: 'm5-q11', kind: 'choice',
      prompt: "Your n8n HTTP Request node calls `POST /v1/invoices` with *Retry On Fail* on. A timeout led to two identical invoices. What fixes it?",
      options: [
        { text: "Send an idempotency key (the order ID) and return the existing invoice on repeats", why: "Yes. The retry is recognised and no duplicate is created." },
        { text: "Raise the node’s timeout to five minutes so the first call always finishes first", why: "Any call can still time out, and then the retry creates a duplicate again." },
        { text: "Change the method to PUT, since PUT requests are idempotent by definition", why: "The method is only a label. The server must actually recognise the repeat." },
        { text: "Wrap the invoice insert in a transaction so the retried insert rolls back", why: "Each request is its own transaction. The second insert succeeds just like the first." },
      ],
      answer: 0,
      explain: "A timeout means “unknown outcome”, so retried creates need idempotency.",
    },
    {
      id: 'm5-q12', kind: 'choice',
      prompt: "Where should the check “is this API key valid?” live in a FastAPI service with ten protected routes?",
      options: [
        { text: "In one dependency, added to each protected route with Depends", why: "Yes. Written once, reused everywhere, easy to override in tests." },
        { text: "Copied into each route, so each can tweak its own rules", why: "Ten copies means ten places to get wrong." },
        { text: "In n8n, as an IF node that checks the key before calling the service", why: "The service must protect itself; other callers could skip n8n." },
        { text: "As a field in the Pydantic model that every request body includes", why: "Models check body data. Keys belong in a header, and GET requests have no body." },
      ],
      answer: 0,
      explain: "Shared concerns like auth, settings and database sessions are dependencies.",
    },
  ],
  tasks: [
    { device: 'phone', plain: 'Learn how FastAPI routes, request and response models, validation and status codes fit together.', done: 'You can say when to return 201, 202, 401, 422 and 503, and you’ve passed the Lesson 2 and 3 checks.' },
    { device: 'computer', plain: 'Build a FastAPI app with /health, /ready and at least one endpoint under /v1.', done: '/ready returns 503 when you stop the database and 200 when it’s back, and /docs lists every endpoint.' },
    { device: 'phone', plain: 'Learn to put a Pydantic model at every boundary: what comes in, what goes out, and what you send to other systems.', done: 'You can explain why invalid data should be rejected before any work starts, and give one example of validating outgoing data.' },
    { device: 'computer', plain: 'Build a webhook endpoint that checks the signature, saves the event once, puts a job on a queue and replies straight away.', done: 'A tampered webhook gets 401, a duplicate is stored only once, and the reply comes back in well under a second.' },
    { device: 'phone', plain: 'Learn how settings, secrets and dependency injection work in FastAPI, and the difference between authentication and authorisation.', done: 'You’ve passed the Lesson 5 check and can explain why a missing setting should stop the app at start-up.' },
    { device: 'phone', plain: 'Learn what async does, and the cases where it doesn’t help: blocking calls, heavy computation and long jobs.', done: 'You can spot the blocking call in the Lesson 6 check and say where a 40-second job should run instead.' },
    { device: 'computer', plain: 'Connect your service to Postgres and write one method that makes two related changes inside a transaction.', done: 'Force the second change to fail and show that the first was rolled back.' },
    { device: 'phone', plain: 'Learn how migrations work with Alembic, and why you don’t change the production database by hand.', done: 'You can describe what alembic revision and alembic upgrade head do, and why the migration files live in Git.' },
    { device: 'computer', plain: 'Add an internal endpoint that n8n calls for one complex transformation, protected by an API key.', done: 'An n8n workflow calls it through an HTTP Request node with Header Auth credentials and uses the result.' },
    { device: 'phone', plain: 'Learn how OpenAPI docs, response contracts and /v1 versioning keep callers from breaking.', done: 'You can list two backward-compatible changes and two breaking ones.' },
    { device: 'computer', plain: 'Write pytest tests with TestClient, including one where a mocked provider times out.', done: 'Tests for 200, 422, 401 and the timeout case all pass with one pytest command.' },
    { device: 'computer', plain: 'Deploy the service and record a short demo of it rejecting bad data, refusing a bad key, succeeding, and recovering from a provider timeout.', done: 'A link to the deployed /docs page plus a recording or screenshots of all four calls.' },
  ],
};
