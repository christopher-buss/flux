---
name: linting
description: Use when setting up ESLint or configuring @isentinel/eslint-config
metadata:
    author: Christopher Buss
    version: "2026.1.29"
---

# Linting

## Overview

`@isentinel/eslint-config` is an opinionated ESLint flat config forked from
`@antfu/eslint-config`. Handles both linting and formatting - no Prettier
needed.

## Key Characteristics

- **No Prettier** - ESLint handles all formatting
- **ESLint Flat config** - Uses `eslint.config.ts` format
- **Forked from antfu** - Similar API, different style opinions
- **roblox-ts support** - Auto-detects and applies roblox-ts rules
- **Respects `.gitignore`** by default

## Style Principles

| Style           | Choice             |
| --------------- | ------------------ |
| Indentation     | Tabs               |
| Quotes          | Double quotes      |
| Semicolons      | Always             |
| Trailing commas | All (ES5+)         |
| Import sorting  | Grouped and sorted |

**Differences from @antfu/eslint-config:**

- Tabs instead of spaces
- Double quotes instead of single
- Semicolons required instead of omitted

## Basic Setup

```ts
// eslint.config.ts
import isentinel from "@isentinel/eslint-config";

export default isentinel();
```

## Configuration Options

```ts
import isentinel from "@isentinel/eslint-config";

export default isentinel({
	// Project name (for config naming)
	name: "my-project",

	// Global ignores
	ignores: ["out/**", "node_modules/**"],

	roblox: true, // true by default

	// Type-aware linting on by default
	typescript: {
		tsconfigPath: "tsconfig.json",
	},
});
```

## Rule Overrides

```ts
export default isentinel(
	{
		// Config options
	},
	// Additional flat configs
	{
		files: ["**/*.ts"],
		rules: {
			"style/semi": ["error", "always"],
		},
	},
);
```

## Plugin Prefix Renaming

Like antfu's config, prefixes are renamed for consistency:

| New Prefix | Original               |
| ---------- | ---------------------- |
| `ts/*`     | `@typescript-eslint/*` |
| `style/*`  | `@stylistic/*`         |

## Usage

```bash
# Check for errors
nr lint

# Auto-fix errors
nr lint --fix
```
