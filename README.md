# Second Brain Pocket

Read-only iPhone view of Second Brain. The Mac builds a small snapshot from a whitelist, encrypts it, and pushes it
to a private repository. This folder is the page that reads and decrypts it. It is meant to become its own repository
(code only, GitHub Pages). It holds no token, no path and no data except a fake demo.

## What is in the snapshot (Tan approved rows 1-11 on 2026-10-31; row 12 is not in v1)
Task: area, status, type label, deadline, days left, overdue flag. Project: standard code and status. Calendar today:
start, end, Meeting or Class. Habits: numbered, check-ins in 7 days, streak, 7 dots. Never: titles, project names, next
actions, notes, habit names, paths, health detail. Built in `backend/app/pocket.py` from empty dictionaries.

## Encryption
AES-256-GCM, key from the passphrase with PBKDF2-SHA256 (600,000 rounds), fresh salt and iv each time, done by
`crypto.mjs` (Web Crypto on the phone, Node on the Mac). The passphrase is typed each session and kept only in memory.
Lock, reload of the page or leaving the page clears it.

## Try it with fake data
```
cd pocket && python3 -m http.server 14240 --bind 127.0.0.1     # open http://127.0.0.1:14240, press the demo button
```
`backend/pocket_demo.py` rebuilds `demo/snapshot.enc.json`; its passphrase `demo-fake-passphrase` is public.

## Mac commands (nothing is pushed until Tan says yes in words)
```
python backend/pocket_cli.py --fake out.json     # fake data
python backend/pocket_cli.py --real out.json     # live data, local file only
python backend/pocket_cli.py --push out.json <remote-url>   # history-free force-push of branch "snapshot"
```

## Tan's steps before the first real push
1. Create the private data repository and a write token (kept in the Mac Keychain). Claude does not create them.
2. Create the code repository, enable GitHub Pages and branch protection, and copy `pocket/` into it.
3. Create a read-only fine-grained token for the data repository, with an expiry date, and enter it on the phone under "Kết nối".
4. Choose the passphrase (long, not reused). Say "đồng ý" for the first real push.

## Tests
`node --test pocket/tests/pocket.test.mjs` and `PYTHONPATH=backend python -m pytest backend/tests/test_pocket.py`.
