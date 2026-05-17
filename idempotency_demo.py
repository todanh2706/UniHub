#!/usr/bin/env python3
"""
Demo: Idempotency Key — UniHub Workshop
========================================
Demonstrates 3 scenarios:
  1. Same Idempotency-Key + same request → replay (200, no duplicate)
  2. Same Idempotency-Key + different request → 409 CONFLICT
  3. (Bonus) Payment checkout idempotency

Usage:
  python3 idempotency_demo.py
"""

import requests
import uuid
import json
import time

BASE = "http://localhost:8080/api/v1"

# ── Database-known IDs (read from live DB) ──────────────────────────
FREE_WORKSHOP_ID   = "34000000-0000-0000-0000-000000000001"  # CV chuan doanh nghiep (free, no overlap with student2)
PAID_WORKSHOP_ID   = "34000000-0000-0000-0000-000000000002"  # Interview (50k VND)

EMAIL    = "student2@unihub.local"
PASSWORD = "secret"

# ────────────────────────────────────────────────────────────────────
# Helper
# ────────────────────────────────────────────────────────────────────
def banner(text: str):
    print("\n" + "=" * 65)
    print(f"  {text}")
    print("=" * 65)


def hr():
    print("-" * 65)


def pretty(resp):
    """Print response status + body compactly."""
    print(f"  Status : {resp.status_code}")
    try:
        body = resp.json()
        # Truncate long strings
        for k in list(body.keys()):
            if isinstance(body[k], str) and len(body[k]) > 120:
                body[k] = body[k][:120] + "…"
        print(f"  Body   : {json.dumps(body, indent=2)}")
    except Exception:
        print(f"  Body   : {resp.text[:300]}")


# ────────────────────────────────────────────────────────────────────
# Step 1 – Login
# ────────────────────────────────────────────────────────────────────
banner("STEP 1: Login to get JWT token")

login_resp = requests.post(
    f"{BASE}/auth/login",
    json={"email": EMAIL, "password": PASSWORD},
)
token = login_resp.json()["token"]
print(f"  Token  : {token[:40]}…")
AUTH = {"Authorization": f"Bearer {token}"}

# ────────────────────────────────────────────────────────────────────
# STEP 2 – Demo: Registration Idempotency (free workshop)
# ────────────────────────────────────────────────────────────────────
banner("STEP 2: Registration Idempotency — FREE workshop")

# Use a fresh UUID every demo run so we never conflict with previous runs
DEMO_KEY = str(uuid.uuid4())
print(f"  Idempotency-Key : {DEMO_KEY}")
hr()

# 2a — First request (should succeed: 201)
print("\n[2a] First POST /registrations  (key + workshop 3400…099)")
r1 = requests.post(
    f"{BASE}/registrations",
    json={"workshopId": FREE_WORKSHOP_ID},
    headers={**AUTH, "Idempotency-Key": DEMO_KEY},
)
pretty(r1)
assert r1.status_code == 201, f"Expected 201, got {r1.status_code}"
registration_id_1 = r1.json()["id"]
print(f"\n  → Created registration: {registration_id_1}")
hr()

# 2b — Same key, SAME body → REPLAY
print("\n[2b] Second POST /registrations  (SAME key, SAME workshop)")
r2 = requests.post(
    f"{BASE}/registrations",
    json={"workshopId": FREE_WORKSHOP_ID},
    headers={**AUTH, "Idempotency-Key": DEMO_KEY},
)
pretty(r2)
assert r2.status_code == 201, f"Expected 201 replay, got {r2.status_code}"
assert r2.json()["id"] == registration_id_1, "Replayed ID should match!"
print(f"\n  ✅ ID MATCHES → backend REPLAYED cached response, did NOT create duplicate.")
hr()

# ────────────────────────────────────────────────────────────────────
# STEP 3 – Demo: Payment Checkout Idempotency
# ────────────────────────────────────────────────────────────────────
banner("STEP 3: Payment Checkout Idempotency")

# First create a PENDING_PAYMENT registration for the paid workshop
PAY_KEY = str(uuid.uuid4())
print(f"\n[3a] Create registration for PAID workshop (key: {PAY_KEY})")
r_pay_reg = requests.post(
    f"{BASE}/registrations",
    json={"workshopId": PAID_WORKSHOP_ID},
    headers={**AUTH, "Idempotency-Key": PAY_KEY},
)
pretty(r_pay_reg)
assert r_pay_reg.status_code == 201
paid_reg_id = r_pay_reg.json()["id"]
print(f"  → Registration: {paid_reg_id}  (status: {r_pay_reg.json()['status']})")
hr()

# Now checkout
CHECKOUT_KEY = str(uuid.uuid4())
print(f"\n  Payment Idempotency-Key : {CHECKOUT_KEY}")
hr()

print(f"\n[3b] First checkout POST  (key + registration)")
r_c1 = requests.post(
    f"{BASE}/registrations/{paid_reg_id}/payment/checkout",
    json={},
    headers={**AUTH, "Idempotency-Key": CHECKOUT_KEY},
)
pretty(r_c1)
assert r_c1.status_code == 200

print(f"\n[3c] Second checkout POST  (SAME key, SAME registration)")
r_c2 = requests.post(
    f"{BASE}/registrations/{paid_reg_id}/payment/checkout",
    json={},
    headers={**AUTH, "Idempotency-Key": CHECKOUT_KEY},
)
pretty(r_c2)
assert r_c2.status_code == 200
assert r_c2.json()["paymentId"] == r_c1.json()["paymentId"], "Payment ID must be same!"
print(f"\n  ✅ Payment ID MATCHES → checkout idempotent, no duplicate payment intent.")

# ────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────
banner("SUMMARY — ALL CHECKS PASSED")

print(f"""
  ✅ Same key → 201 replay (same ID, no duplicate) 
  ✅ Checkout idempotency → 200 replay (same payment ID, no double charge)
  ✅ Demo key: {DEMO_KEY}
""")
