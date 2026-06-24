# Memory protocol — trap staging

`docs/memory/` is the **staging** area for **traps** — non-obvious mistakes that
cost real time. **Frequency is the filter.** A trap hit once may be a fluke; it
**earns** a `CLAUDE.md` line only by recurring. Stage it, let frequency prove
it, surface it once proven. Promoting is the user's call.

Committed, so counts accumulate across sessions and machines. Index:
`docs/MEMORY.md`. Entries: `docs/memory/<slug>.md`.

## What stages

A trap stages only if **all** hold:

- [ ] It cost real time — not a task-specific one-off.
- [ ] No **gate** catches it — no lint rule, `PreToolUse` hook, type, or CI
      check. A gate costs zero budget and _prevents_ the mistake.
- [ ] It isn't already obvious from the code, git history, or a skill.

**Gateable? It's not a trap — gate it** (see `maintaining-claude-md.md` → "Hard
rules: enforce, don't suggest"). **Durable on sight?** Write it straight to the
right `CLAUDE.md`. Staging is only for traps no gate can express.

## On hitting a trap

1. Check `docs/MEMORY.md` for a match.
2. Match, `staging` → append one dated line under `## Encounters`.
3. Match, `promoted` / `dismissed` → leave it. Already decided.
4. No match → create `docs/memory/<slug>.md` from the template; add a bullet to
   `docs/MEMORY.md`.

Count = `## Encounters` lines. Append, never tally.

## Surface at the threshold

When an appended line brings a `staging` entry to **3**, stop. Surface it to the
user in-session — the trap and its encounters. The agent flags; it does not
promote.

The user sets `status: promoted` (after adding a gate or a `CLAUDE.md` line) or
`status: dismissed` (stays, so it isn't re-staged).

Threshold is 3 — surface earlier for an obviously severe trap.

## Entry template

```markdown
---
name: <short imperative title>
description: <one line — the trap and the fix>
type: trap
status: staging # staging → promoted | dismissed
---

<1–3 sentences: what went wrong and the correct move.>

**Why:** <root cause — why the wrong path tempts.>

**Why no gate:** <why no lint rule / hook / type can catch this.>

## Encounters

- YYYY-MM-DD <what happened, rough cost>
```
