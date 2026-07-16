---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

## Conventions

**Errors are programmer mistakes, not recoverable conditions.** Never use custom
Error classes — roblox-ts compiles `throw obj` to `error(table)`, which Roblox
shows as "Error occurred, no output from Luau." `assert` eagerly evaluates its
second argument, so use it only for plain strings; use `error` for interpolation:

```ts
assert(condition, "plain message");
if (!condition) {
	error(`interpolated ${value}`);
}
```

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /simplify + /code-review to review the work.

Commit your work to the current branch.

Run /create-pr to create a PR for the work when done.