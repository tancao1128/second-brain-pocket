# Second Brain Pocket

Read-only iPhone view of Second Brain, built like the Atomic Habits app: the Mac writes a small snapshot to a secret
Gist, and this page (GitHub Pages, https://tancao.org/second-brain-pocket/) reads it. Nothing to sign in to.

On the iPhone: open the address in Safari, then Share > Add to Home Screen.

## What is in the snapshot (Tan approved rows 1-11 on 2026-10-31)
Task: area, status, type label, deadline, days left, overdue flag. Project: standard code and status. Calendar today:
start, end, Meeting or Class. Habits: numbered, check-ins in 7 days, streak, 7 dots. Never: titles, project names, next
actions, notes, habit names, paths, health detail. Built in `backend/app/pocket.py` from empty dictionaries.
The Gist is secret (unlisted): anyone who has its address can read these labels and numbers.

## Update
`python backend/pocket_cli.py` builds from the running Second Brain and pushes to the Gist (`--dry` prints counts only).
The launchd job `org.tancao.second-brain-pocket` runs it every 30 minutes.

## Tests
`node --test pocket/tests/pocket.test.mjs` and `PYTHONPATH=backend python -m pytest backend/tests/test_pocket.py`.
