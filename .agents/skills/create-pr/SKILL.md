---
name: create-pr
description: Create a GitHub pull request for the current branch with `gh`. Use when the user asks to open a PR, submit changes for review, or open a pushed branch for review.
---

Open a pull request for the already-committed, already-pushed branch. This skill creates the PR only — it never commits, pushes, or renames a branch.

## 1. Read the diff

Resolve the base branch first: `gh repo view --json defaultBranchRef`. Then read the change against it:

```bash
git diff <base>...HEAD --name-status
git log <base>...HEAD --oneline
git diff <base>...HEAD
```

Capture every issue the commits reference (`#NNN`, `closes #NNN`, `fixes #NNN`).

**Done when** you can name the change type, the systems touched, and every referenced issue.

## 2. Guard preconditions

This skill opens the PR and nothing else.

- Uncommitted changes (`git status`) or a branch with no remote → **stop**, surface it to the user, do not auto-fix.

**Done when** the tree is clean and the branch exists on the remote.

## 3. Title

```text
type(scope): imperative description
```

Conventional commit, issue number appended when one is referenced. Derive it from the diff, not the branch name. Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`.

## 4. Body

Prefer a project template if one exists — `.github/PULL_REQUEST_TEMPLATE.md`, `.github/pull_request_template.md`, or a file under `.github/PULL_REQUEST_TEMPLATE/`. Fill it from the diff. Otherwise build the body from these sections:

```markdown
## Summary

[2–5 specific sentences: what changed and why.]

## References

Closes #NNN
Parent: #NNN
```

- **Summary** — concrete, not generic.
- **Manual verification** — add this section *only* for checks CI can't run. Omit it when there is nothing manual to report. Never restate automated test, coverage, or lint results — CI owns those.
- **References** — `Closes #NNN` for each issue the PR resolves. Link a parent PRD with `Parent: #NNN`, or `Closes #NNN` when this is its final slice.

**Done when** every commit-referenced issue is accounted for in the body.

## 5. Create

```bash
gh pr create --title "<title>" --body "<body>" --base <base>
```

Base is the detected default branch. Open ready-for-review unless the changes are clearly WIP or the user asked for a draft, in which case add `--draft`. Honor any base or title the user supplied.

**Done when** `gh` returns the PR URL. Output it.
