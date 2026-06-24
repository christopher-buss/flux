# Maintaining CLAUDE.md files

How CLAUDE.md is organized here, and where new guidance goes. Read this before
adding to any `CLAUDE.md`.

## The structure

Knowledge splits by scope so each session loads only what's relevant:

Root `CLAUDE.md` (always loaded) → package `CLAUDE.md` (on demand) → skill (on
invoke) → `docs/` (on reference).

**Progressive disclosure.** The always-loaded surface stays small; detail sits
one hop away, pulled in only when needed.

## Where does a new fact go?

- Repo-wide (every package)? → root `CLAUDE.md`.
- One package? → that package's `CLAUDE.md`. None yet? Create one (copy an
  existing package file's shape).
- A multi-step procedure? → a skill.
- A hard rule that must hold _every_ time? → a hook or `permissions.deny`, not a
  `CLAUDE.md` line — see "Hard rules: enforce, don't suggest".
- Orienting "what is this package"? → the root package map: one terse line,
  identity + why it matters, no mechanism.
- A trap you're not sure is durable (hit once — maybe a fluke)? → stage it in
  `docs/memory/`, not a `CLAUDE.md` line. Let frequency prove it **earns**
  budget — see `memory-protocol.md`.

**When in doubt, push detail down.** Keep the root a map.

## When to add something

Record a durable fact when you'd otherwise re-explain it next session, a review
caught something the agent should have known, or a new contributor would need
it. **Don't record one-off context, or anything the code / git history already
makes obvious.**

## How to write it

- **Specific and verifiable** — "Query with `.withIndex()`, not `.filter()`"
  beats "write efficient queries".
- **Capabilities over volatile structure** — describe what a package does and
  its domain concepts (stable); avoid exhaustive file-path tables (they drift,
  then send the agent to the wrong place). Give the shape, hint where things
  live, let the agent confirm exact paths at plan time. Stable surfaces (error
  taxonomies, a replication contract) are fine to pin down.
- **Terse** — sacrifice grammar for concision; bullets over paragraphs.
- **Positive-first** — say what to do; keep a negative only when the wrong call
  is a real attractor (e.g. `.filter()`).
- **No meta-commentary** — don't narrate the docs themselves; don't point one
  auto-loaded `CLAUDE.md` at another (they all load together).
- **No duplication** — one home per fact. Lives in a package file or skill
  already? Leave it there.

## Hard rules: enforce, don't suggest

**A `CLAUDE.md` line is guidance, not a guarantee.** It lowers the odds of the
wrong behavior; it doesn't remove them. For a rule that must hold _every_ time —
never `rm -rf` outside a temp dir, always `pnpm` not `npm`, never hand-edit
`_generated/` — prose is the wrong tool. Enforce it deterministically:

- **`permissions.deny`** (`.claude/settings.json`) — static block of a tool,
  command, or path. Simplest when you just forbid something outright.
- **`PreToolUse` hook** — runs _before_ a tool executes and inspects the call.
  Reach for it when the decision needs logic: block `npm` but not `npx`, suggest
  the right command, allow-with-warn.

Wire a `PreToolUse` hook in `.claude/settings.json` with a `matcher` on the
tool, pointing at a script. The script reads the call as JSON on stdin
(`.tool_input.command` for Bash); its **exit code decides** — `0` allows, `2`
blocks and feeds stderr back to Claude to self-correct and retry.

```json
{
	"hooks": {
		"PreToolUse": [
			{
				"matcher": "Bash",
				"hooks": [
					{
						"type": "command",
						"command": ".claude/hooks/enforce-pnpm.sh"
					}
				]
			}
		]
	}
}
```

```sh
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -qE "^npm "; then
  echo "Blocked: use pnpm instead of npm" >&2  # this message is fed back to Claude
  exit 2
fi

exit 0
```

**Why this beats a `CLAUDE.md` line:** it's deterministic (the wrong command
_can't_ run, not just "shouldn't"), and costs **zero instruction budget** — the
hook loads only when its tool fires, not every request.

Two cautions:

- **Match the real invocation, not a mention.** Strip quoted substrings first,
  or a command that merely _references_ `npm` in a string argument gets blocked.
- **Reserve hooks for genuine must-enforce rules** — safety, correctness, hard
  conventions. Don't turn every preference into a hook; that's its own friction.

**Spotted a candidate mid-task? Ask, don't just write the note.** About to add a
`CLAUDE.md` rule a deterministic mechanism would enforce better — a `PreToolUse`
hook, `permissions.deny`, a lint rule, a type constraint, a CI check? Propose it
and ask. The `CLAUDE.md` note is the fallback when none fit, not the default.
