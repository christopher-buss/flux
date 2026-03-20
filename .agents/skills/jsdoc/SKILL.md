--
name: jsdoc
description: Guidelines for writing minimal, high-quality JSDoc comments in TypeScript.
---

# JSDoc Skill

This skill provides simple, focused guidelines for writing JSDoc comments in TypeScript codebases.

## When to Use

- Documenting type properties and configuration options
- Adding context that TypeScript types don't convey
- Providing usage examples for complex APIs
- Writing inline documentation for generated docs

## What It Does

- Defines simple JSDoc conventions for TypeScript
- Focuses on property-level documentation with inline comments
- Uses minimal tags for maximum clarity (`@default`, `@example`, `@note`)
- Avoids redundant tags that duplicate TypeScript type information
- Ensures consistent documentation style across the codebase

## How to Use

Write inline JSDoc comments directly above properties, focusing on what the option does rather than repeating type information.

### Basic Structure

```typescript
export interface Options {
	/**
	 * Brief description of what this property does.
	 * @default 'defaultValue'
	 */
	propertyName?: string;
}
```

## Common Tags

### Use Frequently

| Tag | Purpose | Example |
| --- | ------- | ------- |
| `@default` | Default value | `@default 'dist'` |
| `@example` | Usage example | `@example serverIndex: 0` |
| `@note` | Important caveat | `@note May change in v2` |
| `@deprecated` | Mark as deprecated | `@deprecated Use newOption instead` |
| `@param` | Describe function parameters | `@param name - The name to greet` |
| `@returns` | Describe function return value | `@returns A greeting message` |

### Use Sparingly

| Tag | Purpose | Example |
| --- | ------- | ------- |
| `@see` | Reference docs | `@see https://example.com/docs` |
| `@internal` | Internal API | `@internal` |
| `@beta` | Experimental | `@beta` |

### Avoid (TypeScript Provides)

- ❌ `@type` - Use TypeScript type annotation
- ❌ `@typedef` - Use `type` or `interface`

## Documentation Patterns

### Simple Property

```typescript
interface Config {
	/** Output directory for generated files. */
	outDir?: string;
}
```

### Property with Default

```typescript
interface Config {
	/**
	 * Set a suffix for generated files.
	 * @default 'generated'
	 */
	suffix?: string;
}
```

### Enum with Options

```typescript
interface Config {
	/**
	 * Choose output format.
	 * - 'type' generates type aliases
	 * - 'interface' generates interfaces.
	 * @default 'type'
	 */
	format?: "interface" | "type";
}
```

### Property with Example

```typescript
interface Config {
	/**
	 * Server index to use.
	 * @example
	 * - `0` returns production URL
	 * - `1` returns development URL
	 */
	serverIndex?: number;
}
```

### Nested Properties

```typescript
interface Config {
	transformers?: {
		/** Customize file names. */
		name?: (name: string) => string;
		/** Customize output paths. */
		path?: (path: string) => string;
	};
}
```

### Function Documentation

Add JSDoc to all public exported API, focusing on behavior and usage rather than types.

```typescript
// ✅ JSDoc adds value - explains behavior
/**
 * Convert path to template string.
 *
 * @param path - The input path to convert.
 * @example /api/{id} => `/api/${id}`
 */
export function toTemplate(path: string): string {
	// implementation
}

// ✅ No JSDoc needed - internal utility function
function camelCase(str: string): string {
	return str.replace(/-./g, (x) => x[1].toUpperCase());
}
```

## Guidelines

**✅ DO:**
- Document **what** the property does, not the type
- Include `@default` for default values
- Add `@example` for complex or non-obvious usage
- Use `@note` for version info or important caveats
- Keep descriptions concise and focused

**❌ DON'T:**
- Repeat information from TypeScript types
- Over-document simple, self-explanatory properties
- Write redundant descriptions

## Tag Order

For consistency, use this tag order:

1. Description (required)
2. `@default` (if applicable)
3. `@example` (if helpful)
4. `@note` (if needed)
5. `@deprecated` (if applicable)
6. `@see` (if providing references)

The ESlint plugin will enforce any missing required tags or incorrect tag usage
based on these guidelines - make sure to follow them for consistent,
high-quality documentation!

## Related Skills

| Skill | Use For |
| ----- | ------- |
| **[../documentation/SKILL.md](../documentation/SKILL.md)** | Writing markdown documentation files |
| **[../coding-style/SKILL.md](../coding-style/SKILL.md)** | General coding conventions |