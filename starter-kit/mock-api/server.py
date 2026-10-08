#!/usr/bin/env python3
"""
Fake CRM API for practice.

A small, local, pretend CRM that behaves like real APIs do on a bad day:
tokens expire, access gets revoked, you get rate limited, servers fail,
and a plain "create" makes duplicates.

Run it (Python 3.11+, nothing to install):

    python3 server.py                     # normal mode on http://localhost:8787
    python3 server.py --chaos             # random 500/503/slow/broken responses
    python3 server.py --token-ttl 30      # access tokens die after 30 seconds

Then open http://localhost:8787/ for a list of endpoints.

Quick tour with curl:

    # 1. Get a token (client id/secret are printed when the server starts)
    curl -s -X POST localhost:8787/oauth/token \
         -d grant_type=client_credentials -d client_id=starter-kit -d client_secret=starter-secret

    # 2. Use it
    curl -s localhost:8787/contacts?limit=5 -H "Authorization: Bearer <access_token>"

Everything lives in memory. Restart the server (or POST /admin/reset) to start fresh.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import random
import secrets
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

# Demo credentials. Real APIs give you these when you register an "app".
CLIENT_ID = "starter-kit"
CLIENT_SECRET = "starter-secret"

# ---------------------------------------------------------------------------
# Fake data
# ---------------------------------------------------------------------------

FIRST_NAMES = [
    "Olivia", "Jack", "Charlotte", "Noah", "Amelia", "William", "Isla", "Oliver",
    "Mia", "Thomas", "Ava", "James", "Grace", "Lucas", "Chloe", "Henry", "Zara",
    "Ethan", "Priya", "Liam", "Mei", "Arjun", "Sofia", "Hamish", "Aisha", "Tom",
]
LAST_NAMES = [
    "Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "Nguyen", "Johnson",
    "Martin", "White", "Anderson", "Walker", "Thompson", "Patel", "Singh", "Chen",
    "Kelly", "Ryan", "O'Brien", "Murphy", "Lee", "Harris", "Clarke", "Kaur",
]
SUBURBS = [
    ("Paddington", "QLD"), ("Chermside", "QLD"), ("Carindale", "QLD"),
    ("Indooroopilly", "QLD"), ("Logan Central", "QLD"), ("Redcliffe", "QLD"),
    ("Newtown", "NSW"), ("Parramatta", "NSW"), ("Fitzroy", "VIC"),
    ("Geelong", "VIC"), ("Fremantle", "WA"), ("Glenelg", "SA"),
]
COMPANIES = [
    None, None, None, "Harbour Cafe", "Summit Physio", "Kookaburra Childcare",
    "Redgum Builders", "Bayside Dental", "Northside Gym", "Pixel & Pine Studio",
]
SOURCES = ["web_form", "email", "phone", "referral", "google_ads", "facebook"]
LIFECYCLE = ["lead", "lead", "lead", "qualified", "customer"]


def make_contacts(count: int, seed: int = 42) -> list[dict]:
    """Generate the same `count` contacts every time (fixed random seed)."""
    rng = random.Random(seed)
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    contacts = []
    for i in range(1, count + 1):
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        suburb, state = rng.choice(SUBURBS)
        created = start + timedelta(minutes=rng.randint(0, 60 * 24 * 270))
        email_name = f"{first}.{last}".lower().replace("'", "")
        contacts.append({
            "id": i,
            "email": f"{email_name}{i}@example.com",
            "first_name": first,
            "last_name": last,
            # About 1 in 6 contacts has no phone number, like real CRM data.
            "phone": None if rng.random() < 0.17 else f"04{rng.randint(10000000, 99999999)}",
            "company": rng.choice(COMPANIES),
            "suburb": suburb,
            "state": state,
            "source": rng.choice(SOURCES),
            "lifecycle_stage": rng.choice(LIFECYCLE),
            "created_at": iso(created),
            "updated_at": iso(created),
        })
    contacts.sort(key=lambda c: c["id"])
    return contacts


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_iso() -> str:
    return iso(datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# Server state (shared by all requests, protected by a lock)
# ---------------------------------------------------------------------------

class State:
    def __init__(self, cfg: argparse.Namespace):
        self.cfg = cfg
        self.lock = threading.Lock()
        self.reset()

    def reset(self) -> None:
        self.contacts: list[dict] = make_contacts(self.cfg.contacts)
        self.next_id = len(self.contacts) + 1
        self.access_tokens: dict[str, float] = {}   # token -> expiry time (unix seconds)
        self.refresh_tokens: set[str] = set()
        self.revoked = self.cfg.revoked
        self.idempotency: dict[str, dict] = {}      # Idempotency-Key -> saved response
        self.hits: dict[str, deque] = {}            # client -> recent request times


# ---------------------------------------------------------------------------
# Cursor helpers. A cursor is an opaque string; inside it is just the last id.
# Clients must not build cursors themselves - they pass back next_cursor.
# ---------------------------------------------------------------------------

def encode_cursor(after_id: int) -> str:
    raw = json.dumps({"after_id": after_id}).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> int:
    padded = cursor + "=" * (-len(cursor) % 4)
    data = json.loads(base64.urlsafe_b64decode(padded.encode()))
    return int(data["after_id"])


# ---------------------------------------------------------------------------
# Request handler
# ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "FakeCRM/1.0"
    state: State  # set in main()

    # Silence the default access log; we print our own, friendlier one.
    def log_message(self, format, *args):  # noqa: A002
        pass

    # ----- small helpers -------------------------------------------------

    def log(self, status: int, note: str = "") -> None:
        stamp = datetime.now().strftime("%H:%M:%S")
        line = f"[{stamp}] {self.command:<4} {self.path:<45} -> {status}"
        if note:
            line += f"   {note}"
        print(line, flush=True)

    def send_json(self, status: int, body: dict | list, headers: dict | None = None,
                  note: str = "") -> None:
        payload = json.dumps(body, indent=2).encode()
        self.send_raw(status, payload, headers, note)

    def send_raw(self, status: int, payload: bytes, headers: dict | None = None,
                 note: str = "", content_type: str = "application/json") -> None:
        self.log(status, note)
        try:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(payload)))
            for k, v in (headers or {}).items():
                self.send_header(k, str(v))
            self.end_headers()
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            # The client gave up (for example, it timed out). That's fine.
            print("           (client had already disconnected)", flush=True)

    def error(self, status: int, code: str, message: str, headers: dict | None = None,
              note: str = "") -> None:
        self.send_json(status, {"error": code, "message": message}, headers, note or message)

    def read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length else b""

    def read_json(self) -> dict | None:
        """Return the parsed JSON body, or send a 400 and return None."""
        raw = self.read_body()
        try:
            data = json.loads(raw or b"{}")
        except json.JSONDecodeError as e:
            self.error(400, "invalid_json", f"Body is not valid JSON: {e}")
            return None
        if not isinstance(data, dict):
            self.error(400, "invalid_json", "Body must be a JSON object, like {\"email\": \"...\"}")
            return None
        return data

    # ----- the "guards" every /contacts request goes through ---------------

    def check_rate_limit(self) -> bool:
        """Allow `rate_limit` requests per `rate_window` seconds per client. Else 429."""
        cfg = self.state.cfg
        client = self.client_address[0]
        now = time.time()
        with self.state.lock:
            q = self.state.hits.setdefault(client, deque())
            while q and q[0] <= now - cfg.rate_window:
                q.popleft()
            if len(q) >= cfg.rate_limit:
                retry_after = max(1, int(q[0] + cfg.rate_window - now + 0.999))
                allowed = False
            else:
                q.append(now)
                allowed = True
        if not allowed:
            self.error(
                429, "rate_limited",
                f"Too many requests: limit is {cfg.rate_limit} per {cfg.rate_window}s. "
                f"Wait {retry_after}s (see the Retry-After header) and try again.",
                headers={"Retry-After": retry_after,
                         "X-RateLimit-Limit": cfg.rate_limit,
                         "X-RateLimit-Remaining": 0},
                note=f"RATE LIMITED - client should wait {retry_after}s (Retry-After)",
            )
        return allowed

    def check_auth(self) -> bool:
        """Require 'Authorization: Bearer <token>' with a live token. Else 401."""
        header = self.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            self.error(401, "missing_token",
                       "Send a header like 'Authorization: Bearer <access_token>'. "
                       "Get a token from POST /oauth/token.",
                       headers={"WWW-Authenticate": 'Bearer realm="fake-crm"'},
                       note="no bearer token")
            return False
        token = header.removeprefix("Bearer ").strip()
        with self.state.lock:
            expiry = self.state.access_tokens.get(token)
            revoked = self.state.revoked
        if revoked:
            self.error(401, "invalid_token",
                       "Access was revoked by the user. Refreshing will not work; "
                       "someone has to reconnect the app.",
                       headers={"WWW-Authenticate": 'Bearer error="invalid_token", '
                                'error_description="access revoked"'},
                       note="token rejected: access REVOKED")
            return False
        if expiry is None:
            self.error(401, "invalid_token", "Unknown access token.",
                       headers={"WWW-Authenticate": 'Bearer error="invalid_token"'},
                       note="unknown token")
            return False
        if time.time() > expiry:
            self.error(401, "invalid_token",
                       "The access token expired. Use your refresh_token at POST /oauth/token "
                       "(grant_type=refresh_token) to get a new one.",
                       headers={"WWW-Authenticate": 'Bearer error="invalid_token", '
                                'error_description="The access token expired"'},
                       note="token EXPIRED - client should refresh")
            return False
        return True

    def maybe_chaos(self) -> bool:
        """In --chaos mode, sometimes misbehave. Returns True if a response was already sent."""
        cfg = self.state.cfg
        if not cfg.chaos or random.random() >= cfg.chaos_rate:
            return False
        kind = random.choice(["500", "503", "slow", "bad_json"])
        if kind == "500":
            self.error(500, "internal_error", "Something broke on our side. (chaos)",
                       note="CHAOS: 500")
        elif kind == "503":
            self.error(503, "unavailable", "Service temporarily unavailable. (chaos)",
                       headers={"Retry-After": 2}, note="CHAOS: 503 with Retry-After: 2")
        elif kind == "slow":
            print(f"           CHAOS: sleeping {cfg.chaos_delay}s before answering "
                  "(your client should time out first)", flush=True)
            time.sleep(cfg.chaos_delay)
            return False  # then answer normally, far too late
        else:
            self.send_raw(200, b'{"data": [{"id": 1, "email": "broken@exam', note="CHAOS: malformed JSON")
        return True

    # ----- routing -----------------------------------------------------------

    def do_GET(self):  # noqa: N802
        url = urlparse(self.path)
        if url.path == "/":
            return self.send_json(200, HELP)
        if url.path == "/health":
            return self.send_json(200, {"ok": True, "time": now_iso()})
        if url.path == "/contacts":
            if self.guards():
                return self.list_contacts(parse_qs(url.query))
            return None
        if url.path.startswith("/contacts/"):
            if self.guards():
                return self.get_contact(url.path.removeprefix("/contacts/"))
            return None
        return self.error(404, "not_found", f"No route for GET {url.path}. Try GET /")

    def do_POST(self):  # noqa: N802
        path = urlparse(self.path).path
        if path == "/oauth/token":
            return self.token()
        if path == "/contacts":
            if self.guards():
                return self.create_contact()
            return None
        if path == "/admin/revoke":
            with self.state.lock:
                self.state.revoked = True
            return self.send_json(200, {"revoked": True},
                                  note="ADMIN: access revoked (simulates the user disconnecting your app)")
        if path == "/admin/restore":
            with self.state.lock:
                self.state.revoked = False
                self.state.access_tokens.clear()
                self.state.refresh_tokens.clear()
            return self.send_json(200, {"revoked": False},
                                  note="ADMIN: access restored - old tokens cleared, get a new one")
        if path == "/admin/reset":
            with self.state.lock:
                self.state.reset()
            return self.send_json(200, {"reset": True}, note="ADMIN: all data and tokens reset")
        return self.error(404, "not_found", f"No route for POST {path}. Try GET /")

    def do_PUT(self):  # noqa: N802
        path = urlparse(self.path).path
        if path == "/contacts/upsert":
            if self.guards():
                return self.upsert_contact()
            return None
        return self.error(404, "not_found", f"No route for PUT {path}. Try GET /")

    def guards(self) -> bool:
        """Rate limit -> auth -> chaos. True means 'carry on and handle the request'."""
        return self.check_rate_limit() and self.check_auth() and not self.maybe_chaos()

    # ----- endpoints ---------------------------------------------------------

    def token(self):
        """POST /oauth/token - client_credentials or refresh_token grant."""
        raw = self.read_body()
        ctype = self.headers.get("Content-Type", "")
        if "json" in ctype:
            try:
                form = json.loads(raw or b"{}")
            except json.JSONDecodeError:
                return self.error(400, "invalid_request", "Body is not valid JSON.")
        else:  # the OAuth standard: application/x-www-form-urlencoded
            form = {k: v[0] for k, v in parse_qs(raw.decode()).items()}

        # Client id/secret may also arrive as HTTP Basic auth.
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Basic "):
            try:
                cid, _, csec = base64.b64decode(auth[6:]).decode().partition(":")
                form.setdefault("client_id", cid)
                form.setdefault("client_secret", csec)
            except Exception:
                pass

        grant = form.get("grant_type")
        with self.state.lock:
            revoked = self.state.revoked

        if grant == "client_credentials":
            if form.get("client_id") != CLIENT_ID or form.get("client_secret") != CLIENT_SECRET:
                return self.send_json(401, {"error": "invalid_client",
                                            "error_description": "Wrong client_id or client_secret."},
                                      note="bad client credentials")
            if revoked:
                return self.send_json(400, {"error": "invalid_grant",
                                            "error_description": "The user revoked access to this app. "
                                            "A person must reconnect it (POST /admin/restore simulates that)."},
                                      note="token refused: access REVOKED")
            return self.issue_tokens(new_refresh=True, note="new token (client_credentials)")

        if grant == "refresh_token":
            rt = form.get("refresh_token", "")
            if revoked:
                return self.send_json(400, {"error": "invalid_grant",
                                            "error_description": "Refresh token has been revoked. "
                                            "A person must reconnect the app."},
                                      note="refresh refused: invalid_grant (REVOKED) - alert a human!")
            with self.state.lock:
                known = rt in self.state.refresh_tokens
            if not known:
                return self.send_json(400, {"error": "invalid_grant",
                                            "error_description": "Unknown refresh token."},
                                      note="refresh refused: unknown refresh token")
            return self.issue_tokens(new_refresh=False, refresh_token=rt,
                                     note="token refreshed (grant_type=refresh_token)")

        return self.send_json(400, {"error": "unsupported_grant_type",
                                    "error_description": "Use grant_type=client_credentials "
                                    "or grant_type=refresh_token."})

    def issue_tokens(self, new_refresh: bool, refresh_token: str = "", note: str = ""):
        ttl = self.state.cfg.token_ttl
        access = "at_" + secrets.token_urlsafe(18)
        if new_refresh:
            refresh_token = "rt_" + secrets.token_urlsafe(18)
        with self.state.lock:
            self.state.access_tokens[access] = time.time() + ttl
            self.state.refresh_tokens.add(refresh_token)
        return self.send_json(200, {
            "access_token": access,
            "token_type": "Bearer",
            "expires_in": ttl,
            "refresh_token": refresh_token,
            "scope": "contacts.read contacts.write",
        }, note=f"{note}, expires in {ttl}s")

    def list_contacts(self, query: dict):
        """GET /contacts?limit=25&cursor=... - cursor pagination."""
        try:
            limit = int(query.get("limit", ["25"])[0])
        except ValueError:
            return self.error(400, "invalid_limit", "limit must be a whole number between 1 and 100.")
        if not 1 <= limit <= 100:
            return self.error(400, "invalid_limit", "limit must be between 1 and 100.")
        after_id = 0
        if "cursor" in query and query["cursor"][0]:
            try:
                after_id = decode_cursor(query["cursor"][0])
            except Exception:
                return self.error(400, "invalid_cursor",
                                  "That cursor is not valid. Pass back next_cursor exactly as you got it.")
        with self.state.lock:
            remaining = [c for c in self.state.contacts if c["id"] > after_id]
        page = remaining[:limit]
        has_more = len(remaining) > limit
        next_cursor = encode_cursor(page[-1]["id"]) if has_more else None
        note = f"{len(page)} contacts (ids {page[0]['id']}-{page[-1]['id']}), has_more={has_more}" if page \
            else "0 contacts"
        return self.send_json(200, {"data": page, "next_cursor": next_cursor, "has_more": has_more},
                              note=note)

    def get_contact(self, raw_id: str):
        try:
            cid = int(raw_id)
        except ValueError:
            return self.error(404, "not_found", "Contact ids are numbers, e.g. /contacts/42")
        with self.state.lock:
            match = next((c for c in self.state.contacts if c["id"] == cid), None)
        if not match:
            return self.error(404, "not_found", f"No contact with id {cid}.")
        return self.send_json(200, match, note=f"contact {cid}")

    def create_contact(self):
        """POST /contacts - ALWAYS creates a new contact, even if the email already exists.

        This is on purpose: it shows how retries and duplicate webhooks
        create duplicate records. Use PUT /contacts/upsert instead.
        """
        data = self.read_json()
        if data is None:
            return None
        if not data.get("email"):
            return self.error(422, "validation_error", "email is required.")
        with self.state.lock:
            contact = self.new_contact(data)
            dupes = sum(1 for c in self.state.contacts
                        if c["email"].strip().lower() == contact["email"].strip().lower())
        note = f"created contact {contact['id']}"
        if dupes > 1:
            note += f"  WARNING: {dupes} contacts now share {contact['email']} (DUPLICATE!)"
        return self.send_json(201, contact, note=note)

    def upsert_contact(self):
        """PUT /contacts/upsert - create or update, matched by email. Honours Idempotency-Key."""
        raw = self.read_body()
        key = self.headers.get("Idempotency-Key")
        fingerprint = hashlib.sha256(raw).hexdigest()

        # 1) Seen this Idempotency-Key before? Replay the saved answer, do nothing else.
        if key:
            with self.state.lock:
                saved = self.state.idempotency.get(key)
            if saved:
                if saved["fingerprint"] != fingerprint:
                    return self.error(422, "idempotency_key_reused",
                                      "This Idempotency-Key was already used with a different body. "
                                      "Use a new key for a different operation.")
                return self.send_raw(saved["status"], saved["body"],
                                     headers={"Idempotent-Replayed": "true"},
                                     note=f"Idempotency-Key '{key}' seen before - replayed saved "
                                          "response, nothing changed")

        try:
            data = json.loads(raw or b"{}")
            assert isinstance(data, dict)
        except (json.JSONDecodeError, AssertionError):
            return self.error(400, "invalid_json", "Body must be a JSON object, like {\"email\": \"...\"}")
        email = (data.get("email") or "").strip().lower()
        if "@" not in email:
            return self.error(422, "validation_error", "A valid email is required for upsert.")

        # 2) Find by normalised email. Update if found, create if not.
        with self.state.lock:
            matches = [c for c in self.state.contacts if c["email"].strip().lower() == email]
            if matches:
                contact = matches[0]  # the oldest one
                for field in ALLOWED_FIELDS:
                    if field in data and field != "email":
                        contact[field] = data[field]
                contact["updated_at"] = now_iso()
                status, result = 200, {"result": "updated", "contact": contact}
                if len(matches) > 1:
                    result["warning"] = (f"{len(matches)} contacts share this email (made by POST /contacts). "
                                         f"Updated the oldest, id {contact['id']}.")
            else:
                contact = self.new_contact({**data, "email": email})
                status, result = 201, {"result": "created", "contact": contact}
            body = json.dumps(result, indent=2).encode()
            if key:
                self.state.idempotency[key] = {"fingerprint": fingerprint, "status": status, "body": body}
        note = f"upsert {result['result']} contact {contact['id']} ({email})"
        if key:
            note += f", saved under Idempotency-Key '{key}'"
        return self.send_raw(status, body, note=note)

    def new_contact(self, data: dict) -> dict:
        """Append a contact. Caller must hold the lock."""
        contact = {field: data.get(field) for field in ALLOWED_FIELDS}
        contact["id"] = self.state.next_id
        contact["lifecycle_stage"] = contact.get("lifecycle_stage") or "lead"
        contact["created_at"] = contact["updated_at"] = now_iso()
        self.state.next_id += 1
        self.state.contacts.append(contact)
        return contact


ALLOWED_FIELDS = ["email", "first_name", "last_name", "phone", "company", "suburb", "state",
                  "source", "lifecycle_stage"]

HELP = {
    "name": "Fake CRM API (starter kit)",
    "auth": {
        "get_token": "POST /oauth/token  form: grant_type=client_credentials&client_id=starter-kit"
                     "&client_secret=starter-secret",
        "refresh": "POST /oauth/token  form: grant_type=refresh_token&refresh_token=<rt_...>",
        "use": "Header  Authorization: Bearer <access_token>",
    },
    "endpoints": {
        "GET /contacts?limit=25&cursor=": "List contacts. Follow next_cursor until has_more is false.",
        "GET /contacts/{id}": "One contact.",
        "POST /contacts": "Create a contact. Makes DUPLICATES if the email exists (on purpose).",
        "PUT /contacts/upsert": "Create or update by email. Send an Idempotency-Key header to make retries safe.",
        "POST /admin/revoke": "Simulate the user revoking your app's access.",
        "POST /admin/restore": "Undo the revoke (like the user reconnecting).",
        "POST /admin/reset": "Reset all data and tokens.",
        "GET /health": "Health check, no auth, no rate limit.",
    },
}


def main() -> None:
    p = argparse.ArgumentParser(description="Fake CRM API for practising API integrations.")
    p.add_argument("--port", type=int, default=8787, help="port to listen on (default 8787)")
    p.add_argument("--host", default="127.0.0.1",
                   help="address to bind (default 127.0.0.1; use 0.0.0.0 so n8n in Docker can reach it)")
    p.add_argument("--contacts", type=int, default=300, help="how many fake contacts (default 300)")
    p.add_argument("--token-ttl", type=int, default=300,
                   help="access token lifetime in seconds (default 300)")
    p.add_argument("--rate-limit", type=int, default=10, help="requests allowed per window (default 10)")
    p.add_argument("--rate-window", type=int, default=10, help="window length in seconds (default 10)")
    p.add_argument("--revoked", action="store_true", help="start with access already revoked")
    p.add_argument("--chaos", action="store_true",
                   help="randomly return 500/503, malformed JSON, or answer very slowly")
    p.add_argument("--chaos-rate", type=float, default=0.3,
                   help="chance (0-1) that a request misbehaves in chaos mode (default 0.3)")
    p.add_argument("--chaos-delay", type=float, default=20,
                   help="seconds a 'slow' chaos response waits (default 20)")
    cfg = p.parse_args()

    Handler.state = State(cfg)
    server = ThreadingHTTPServer((cfg.host, cfg.port), Handler)
    print(f"Fake CRM API running on http://{'localhost' if cfg.host == '127.0.0.1' else cfg.host}:{cfg.port}")
    print(f"  client_id={CLIENT_ID}  client_secret={CLIENT_SECRET}")
    print(f"  {cfg.contacts} contacts | tokens last {cfg.token_ttl}s | "
          f"rate limit {cfg.rate_limit} per {cfg.rate_window}s | "
          f"chaos {'ON (' + str(int(cfg.chaos_rate * 100)) + '%)' if cfg.chaos else 'off'}"
          f"{' | ACCESS REVOKED' if cfg.revoked else ''}")
    print("  Open http://localhost:%d/ for the endpoint list. Ctrl+C to stop.\n" % cfg.port, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
