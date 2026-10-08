#!/usr/bin/env python3
"""
How to verify a signed webhook - and a tiny receiver that does it properly.

The rules a webhook receiver should follow:
  1. Verify the signature over the RAW body bytes (not re-serialised JSON).
  2. Reject old timestamps (replay attacks). 5 minutes is a common tolerance.
  3. Compare signatures with hmac.compare_digest (constant time).
  4. Dedupe by event id: the same event can be delivered more than once.
  5. Don't trust arrival order: use the event's own time/sequence.
  6. Reply 2xx fast, do the slow work afterwards.

Two ways to use this file (Python 3.11+, nothing to install):

    python3 verify_example.py --selftest
        Runs the verify() function against good and bad examples.

    python3 verify_example.py --serve --port 9000
        Starts a local receiver on http://localhost:9000/ . Point
        send_webhook.py at it to watch each scenario get accepted or rejected:
            python3 send_webhook.py --url http://localhost:9000/ --mode all

The same logic works in an n8n Code node (JavaScript): turn on the Webhook
node's "Raw Body" option, then use crypto.createHmac('sha256', secret).
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_SECRET = "whsec_starter_kit_secret"
SIGNATURE_HEADER = "X-Webhook-Signature"
TOLERANCE_SECONDS = 300


class InvalidSignature(Exception):
    """Raised when a webhook must be rejected. The message says why."""


def verify(raw_body: bytes, signature_header: str | None, secret: str,
           tolerance: int = TOLERANCE_SECONDS, now: float | None = None) -> None:
    """Raise InvalidSignature unless the header is a valid, recent signature of raw_body."""
    if not signature_header:
        raise InvalidSignature("missing signature header")

    # Header looks like: t=1700000000,v1=abc123...
    parts = dict(item.split("=", 1) for item in signature_header.split(",") if "=" in item)
    try:
        timestamp = int(parts["t"])
        received_sig = parts["v1"]
    except (KeyError, ValueError):
        raise InvalidSignature("malformed signature header") from None

    now = time.time() if now is None else now
    if abs(now - timestamp) > tolerance:
        raise InvalidSignature(f"timestamp too old/new ({int(now - timestamp)}s off) - possible replay")

    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_sig):
        raise InvalidSignature("signature does not match body - tampered or wrong secret")


# ---------------------------------------------------------------------------
# A small receiver that applies all six rules
# ---------------------------------------------------------------------------

class Receiver(BaseHTTPRequestHandler):
    secret = DEFAULT_SECRET
    lock = threading.Lock()
    seen_event_ids: set[str] = set()      # in real life: a DB table with a UNIQUE event_id
    latest: dict[str, tuple[int, str]] = {}  # lead_id -> (sequence, status)

    def log_message(self, format, *args):  # noqa: A002
        pass

    def reply(self, status: int, message: str) -> None:
        body = json.dumps({"status": status, "message": message}).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        print(f"  {status}  {message}", flush=True)

    def do_POST(self):  # noqa: N802
        raw = self.rfile.read(int(self.headers.get("Content-Length") or 0))  # rule 1: raw bytes

        try:
            verify(raw, self.headers.get(SIGNATURE_HEADER), self.secret)   # rules 1-3
        except InvalidSignature as e:
            return self.reply(400, f"rejected: {e}")

        event = json.loads(raw)
        with self.lock:
            if event["id"] in self.seen_event_ids:                         # rule 4
                return self.reply(200, f"duplicate {event['id']} ignored (already processed)")
            self.seen_event_ids.add(event["id"])

            obj = event.get("data", {}).get("object", {})
            lead_id, seq = obj.get("lead_id"), event.get("sequence", 0)
            current = self.latest.get(lead_id)
            if current and current[0] > seq:                               # rule 5
                return self.reply(200, f"stored {event['id']} but it's older (seq {seq}) than "
                                       f"what we have (seq {current[0]}, '{current[1]}') - not applied")
            self.latest[lead_id] = (seq, obj.get("status", "?"))

        # Rule 6: in a real system, save the raw event and hand it to a queue here.
        return self.reply(200, f"accepted {event['type']} {event['id']} -> {lead_id} is now "
                               f"'{obj.get('status')}' (seq {seq})")


def selftest(secret: str) -> None:
    body = b'{"id":"evt_1","type":"lead.created"}'
    now = int(time.time())
    good = f"t={now},v1=" + hmac.new(secret.encode(), f"{now}.".encode() + body, hashlib.sha256).hexdigest()
    old = now - 600
    old_sig = f"t={old},v1=" + hmac.new(secret.encode(), f"{old}.".encode() + body, hashlib.sha256).hexdigest()
    cases = [
        ("valid", body, good, True),
        ("tampered body", body.replace(b"created", b"deleted"), good, False),
        ("wrong secret", body, good.replace(good[-4:], "0000"), False),
        ("old timestamp (replay)", body, old_sig, False),
        ("missing header", body, None, False),
        ("garbage header", body, "hello", False),
    ]
    failures = 0
    for name, raw, header, should_pass in cases:
        try:
            verify(raw, header, secret)
            passed, why = True, "ok"
        except InvalidSignature as e:
            passed, why = False, str(e)
        ok = passed == should_pass
        failures += not ok
        print(f"{'PASS' if ok else 'FAIL'}  {name:<24} -> {'accepted' if passed else 'rejected'} ({why})")
    print("\nAll checks passed." if not failures else f"\n{failures} check(s) failed.")
    raise SystemExit(1 if failures else 0)


def main() -> None:
    p = argparse.ArgumentParser(description="Verify signed webhooks.")
    p.add_argument("--selftest", action="store_true", help="run verify() against good and bad examples")
    p.add_argument("--serve", action="store_true", help="run a local receiver")
    p.add_argument("--port", type=int, default=9000)
    p.add_argument("--secret", default=DEFAULT_SECRET)
    args = p.parse_args()

    if args.selftest:
        selftest(args.secret)
    elif args.serve:
        Receiver.secret = args.secret
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Receiver)
        print(f"Webhook receiver on http://localhost:{args.port}/  (Ctrl+C to stop)", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
    else:
        p.print_help()


if __name__ == "__main__":
    main()
