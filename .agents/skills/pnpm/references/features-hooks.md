---
name: pnpm-hooks
description:
    Customize package resolution and dependency behavior with pnpmfile hooks
---

# pnpm Hooks

pnpm provides hooks via `.pnpmfile.cjs` to customize how packages are resolved
and their metadata is processed.

## Setup

Create `.pnpmfile.cjs` at workspace root:

```js
function afterAllResolved(lockfile, context) {
	// Modify lockfile
	return lockfile;
}

// .pnpmfile.cjs
function readPackage(package_, context) {
	// Modify package metadata
	return package_;
}

module.exports = {
	hooks: {
		afterAllResolved,
		readPackage,
	},
};
```

## readPackage Hook

Called for every package before resolution. Use to modify dependencies, add
missing peer deps, or fix broken packages.

### Add Missing Peer Dependency

```js
function readPackage(package_, context) {
	if (package_.name === "some-broken-package") {
		package_.peerDependencies = {
			...package_.peerDependencies,
			react: "*",
		};
		context.log(`Added react peer dep to ${package_.name}`);
	}

	return package_;
}
```

### Override Dependency Version

```js
function readPackage(package_, context) {
	// Fix all lodash versions
	if (package_.dependencies?.lodash) {
		package_.dependencies.lodash = "^4.17.21";
	}

	if (package_.devDependencies?.lodash) {
		package_.devDependencies.lodash = "^4.17.21";
	}

	return package_;
}
```

### Remove Unwanted Dependency

```js
function readPackage(package_, context) {
	// Remove optional dependency that causes issues
	if (package_.optionalDependencies?.fsevents) {
		delete package_.optionalDependencies.fsevents;
	}

	return package_;
}
```

### Replace Package

```js
function readPackage(package_, context) {
	// Replace deprecated package
	if (package_.dependencies?.["old-package"]) {
		package_.dependencies["new-package"] = package_.dependencies["old-package"];
		delete package_.dependencies["old-package"];
	}

	return package_;
}
```

### Fix Broken Package

```js
function readPackage(package_, context) {
	// Fix incorrect exports field
	if (package_.name === "broken-esm-package") {
		package_.exports = {
			".": {
				import: "./dist/index.mjs",
				require: "./dist/index.cjs",
			},
		};
	}

	return package_;
}
```

## afterAllResolved Hook

Called after the lockfile is generated. Use for post-resolution modifications.

```js
function afterAllResolved(lockfile, context) {
	// Log all resolved packages
	context.log(`Resolved ${Object.keys(lockfile.packages || {}).length} packages`);

	// Modify lockfile if needed
	return lockfile;
}
```

## Context Object

The `context` object provides utilities:

```js
function readPackage(package_, context) {
	// Log messages
	context.log("Processing package...");

	return package_;
}
```

## Use with TypeScript

For type hints, use JSDoc:

```js
// .pnpmfile.cjs
function readPackage(package_, context) {
	return package_;
}

module.exports = {
	hooks: {
		readPackage,
	},
};
```

## Common Patterns

### Conditional by Package Name

```js
function readPackage(package_, context) {
	switch (package_.name) {
		case "package-a": {
			package_.dependencies.foo = "^2.0.0";
			break;
		}
		case "package-b": {
			delete package_.optionalDependencies.bar;
			break;
		}
	}

	return package_;
}
```

### Apply to All Packages

```js
function readPackage(package_, context) {
	// Remove all optional fsevents
	if (package_.optionalDependencies) {
		delete package_.optionalDependencies.fsevents;
	}

	return package_;
}
```

### Debug Resolution

```js
function readPackage(package_, context) {
	if (process.env.DEBUG_PNPM) {
		context.log(`${package_.name}@${package_.version}`);
		context.log(`  deps: ${Object.keys(package_.dependencies || {}).join(", ")}`);
	}

	return package_;
}
```

## Hooks vs Overrides

| Feature    | Hooks (.pnpmfile.cjs)            | Overrides           |
| ---------- | -------------------------------- | ------------------- |
| Complexity | Can use JavaScript logic         | Declarative only    |
| Scope      | Any package metadata             | Version only        |
| Use case   | Complex fixes, conditional logic | Simple version pins |

**Prefer overrides** for simple version fixes. **Use hooks** when you need:

- Conditional logic
- Non-version modifications (exports, peer deps)
- Logging/debugging

## Troubleshooting

### Hook not running

1. Ensure file is named `.pnpmfile.cjs` (not `.js`)
2. Check file is at workspace root
3. Run `pnpm install` to trigger hooks

### Debug hooks

```bash
# See hook logs
pnpm install --reporter=append-only
```

<!--
Source references:
- https://pnpm.io/pnpmfile
-->
