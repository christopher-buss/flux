---
name: tooling
description: Use when setting up pnpm, bun runtime, git hooks, or lint-staged
metadata:
    author: Christopher Buss
    version: "2026.1.29"
---

# Tooling Setup

## Package Manager

Use **pnpm** for package management. Optionally use **bun** as a faster runtime
for scripts.

```json
{
	"packageManager": "pnpm@10.x"
}
```

## Git Hooks (husky + lint-staged)

Use `husky` with `lint-staged` for pre-commit linting:

```bash
ni -D husky lint-staged
npx husky init
```

Configure in `package.json`:

```json
{
	"lint-staged": {
		"*.{js,ts,mjs,mts,tsx}": "eslint --fix"
	}
}
```

Add to `.husky/pre-commit`:

```bash
npx lint-staged
```

## Scripts

Standard scripts for roblox-ts projects:

```json
{
	"scripts": {
		"lint": "eslint --cache .",
		"build": "rbxtsc",
		"watch": "rbxtsc --watch",
		"test": "rbxts-jest"
	}
}
```
