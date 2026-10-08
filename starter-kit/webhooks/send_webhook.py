#!/usr/bin/env python3
"""
Send signed webhook events to any URL - for example an n8n Webhook node.

It signs events the way Stripe does:

    X-Webhook-Signature: t=<unix timestamp>,v1=<hex HMAC-SHA256>

where the HMAC is computed over the string  "<timestamp>.<raw body>"  using a
shared secret. Your receiver recomputes it and compares. If someone changes
even one character of the body, the signature no longer matches.

Examples (Python 3.11+, nothing to install):

    # one normal, correctly signed event
    python3 send_webhook.py --url http://localhost:5678/webhook-test/leads

    # the nasty cases a real receiver must survive
    python3 send_webhook.py --url URL --mode duplicate      # same event twice
    python3 send_webhook.py --url URL --mode out-of-order   # updated arrives before created
    python3 send_webhook.py --url URL --mode tampered       # body changed after signing
    python3 send_webhook.py --url URL --mode replay         # valid signature, 10-minute-old timestamp
    python3 send_webhook.py --url URL --mode all            # all of the above, in order

The secret defaults to "whsec_starter_kit_secret". Use the same one in your receiver.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import random
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

DEFAULT_SECRET = "whsec_starter_kit_secret"
SIGNATURE_HEADER = "X-Webhook-Signature"


def sign(secret: str, timestamp: int, raw_body: bytes) -> str:
    """Return the header value 't=...,v1=...' for this body and timestamp."""
    signed_payload = f"{timestamp}.".encode() + raw_body
    digest = hmac.new(secret.encode(), signed_payload, hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={digest}"


def make_event(event_type: str, lead: dict, occurred_at: datetime | None = None,
               sequence: int = 1) -> dict:
    """Build an event shaped like a typical SaaS webhook."""
    occurred_at = occurred_at or datetime.now(timezone.utc)
    return {
        "id": f"evt_{uuid.uuid4().hex[:20]}",       # unique per event: use it to dedupe
        "type": event_type,
        "created": int(occurred_at.timestamp()),       # when it happened at the provider
        "sequence": sequence,                          # helps you spot out-of-order delivery
        "data": {"object": lead},
    }


def sample_lead() -> dict:
    first = random.choice(["Olivia", "Jack", "Priya", "Liam", "Mei", "Hamish"])
    last = random.choice(["Nguyen", "Smith", "Patel", "O'Brien", "Chen", "Kelly"])
    return {
        "lead_id": f"lead_{random.randint(10000, 99999)}",
        "email": f"{first}.{last}".lower().replace("'", "") + "@example.com",
        "name": f"{first} {last}",
        "phone": f"04{random.randint(10000000, 99999999)}",
        "suburb": random.choice(["Paddington", "Chermside", "Carindale", "Redcliffe"]),
        "source": random.choice(["web_form", "google_ads", "referral"]),
        "status": "new",
    }


def send(url: str, secret: str, event: dict, *, timestamp: int | None = None,
         tamper: bool = False, label: str = "", timeout: float = 10) -> None:
    """Serialise, sign and POST one event. Prints what happened."""
    raw = json.dumps(event, separators=(",", ":")).encode()
    ts = timestamp if timestamp is not None else int(time.time())
    signature = sign(secret, ts, raw)

    if tamper:
        # Change the body AFTER signing, like an attacker editing it in transit.
        tampered = json.loads(raw)
        tampered["data"]["object"]["email"] = "attacker@evil.example"
        raw = json.dumps(tampered, separators=(",", ":")).encode()

    req = urllib.request.Request(url, data=raw, method="POST", headers={
        "Content-Type": "application/json",
        "User-Agent": "starter-kit-webhook-sender/1.0",
        SIGNATURE_HEADER: signature,
        "X-Webhook-Id": event["id"],   # many providers also put the event id in a header
    })
    prefix = f"{label:<22} {event['type']:<14} {event['id']}"
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read(200).decode(errors="replace")
            print(f"{prefix}  -> {resp.status} {body.strip()[:80]}")
    except urllib.error.HTTPError as e:
        body = e.read(200).decode(errors="replace")
        print(f"{prefix}  -> {e.code} {body.strip()[:80]}")
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"{prefix}  -> FAILED to connect: {getattr(e, 'reason', e)}")


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

def normal(url, secret):
    send(url, secret, make_event("lead.created", sample_lead()), label="normal")


def duplicate(url, secret):
    # Providers retry when they don't get a fast 2xx, so the SAME event
    # (same id, same body) can arrive twice. Each delivery is freshly signed.
    event = make_event("lead.created", sample_lead())
    send(url, secret, event, label="duplicate (1st)")
    time.sleep(0.5)
    send(url, secret, event, label="duplicate (2nd)")


def out_of_order(url, secret):
    # Three events for one lead, delivered newest first.
    lead = sample_lead()
    t0 = datetime.now(timezone.utc)
    created = make_event("lead.created", dict(lead), t0, sequence=1)
    contacted = make_event("lead.updated", {**lead, "status": "contacted"},
                           datetime.fromtimestamp(t0.timestamp() + 60, timezone.utc), sequence=2)
    booked = make_event("lead.updated", {**lead, "status": "booked"},
                        datetime.fromtimestamp(t0.timestamp() + 120, timezone.utc), sequence=3)
    for ev, label in [(booked, "out-of-order (seq 3)"), (created, "out-of-order (seq 1)"),
                      (contacted, "out-of-order (seq 2)")]:
        send(url, secret, ev, label=label)
    print("   -> a correct receiver ends with status 'booked' (latest by 'created'/'sequence'),"
          " not 'contacted' (last to arrive).")


def tampered(url, secret):
    send(url, secret, make_event("lead.created", sample_lead()), tamper=True, label="tampered")
    print("   -> a correct receiver rejects this (signature mismatch), e.g. with 400 or 401.")


def replay(url, secret):
    # Correct signature, but signed 10 minutes ago: someone re-sending a captured request.
    old = int(time.time()) - 600
    send(url, secret, make_event("lead.created", sample_lead()), timestamp=old, label="replay (old t=)")
    print("   -> a correct receiver rejects timestamps older than ~5 minutes.")


SCENARIOS = {
    "normal": normal,
    "duplicate": duplicate,
    "out-of-order": out_of_order,
    "tampered": tampered,
    "replay": replay,
}


def main() -> None:
    p = argparse.ArgumentParser(description="Send signed test webhooks to a URL.")
    p.add_argument("--url", required=True,
                   help="where to send, e.g. http://localhost:5678/webhook-test/leads")
    p.add_argument("--secret", default=DEFAULT_SECRET, help=f"shared secret (default {DEFAULT_SECRET})")
    p.add_argument("--mode", default="normal", choices=[*SCENARIOS, "all"],
                   help="which scenario to send (default normal)")
    p.add_argument("--count", type=int, default=1, help="repeat the scenario N times (default 1)")
    args = p.parse_args()

    print(f"Sending to {args.url}  (header {SIGNATURE_HEADER}, secret '{args.secret}')\n")
    modes = list(SCENARIOS) if args.mode == "all" else [args.mode]
    for _ in range(args.count):
        for mode in modes:
            SCENARIOS[mode](args.url, args.secret)


if __name__ == "__main__":
    main()
