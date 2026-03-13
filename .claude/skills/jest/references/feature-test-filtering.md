---
name: Test Filtering
description: |
    Filtering which tests run by file path, name pattern, and glob matching.
---

# Test Filtering

## In-File Filtering: `.only` and `.skip`

Controls which tests run **within a single file**:

```ts
describe.only("focused suite", () => {
	it.only("should run this focused test", () => {
		expect.assertions(1);

		expect(true).toBeTruthy();
	});

	it.skip("should be skipped", () => {
		expect.assertions(1);

		expect(true).toBeFalsy();
	});
});

describe("a now skipped suite", () => {
	it("should be skipped because describe.only above", () => {
		expect.assertions(1);

		expect(true).toBeFalsy();
	});
});
```

`.skip` inside `.only` still skips. `.only` inside `.skip` still skips (skip
wins).

## Filter by File Path

### `testMatch` (glob patterns)

In `jest.config.ts`:

```ts
export = {
	testMatch: ["**/*.spec"],
};
```

Default: `{ "**/__tests__/**/*", "**/?(*.)+(spec|test)?(.lua|.luau)" }`

### `testRegex` (regex patterns)

Mutually exclusive with `testMatch`:

```ts
export = {
	testRegex: ["foo%.lua$"],
};
```

### `testPathPattern` (CLI)

Filter by file path regex at runtime:

```ts
runCLI(
	root,
	{
		testPathPattern: "components",
	},
	[root],
).awaitStatus();
```

### `testPathIgnorePatterns` (CLI/config)

Exclude files matching patterns:

```ts
runCLI(
	root,
	{
		testPathIgnorePatterns: ["legacy", "__fixtures__"],
	},
	[root],
).awaitStatus();
```

## Filter by Test Name

### `testNamePattern`

Match against the full test name (including parent `describe` blocks):

```ts
runCLI(
	root,
	{
		testNamePattern: "auth",
	},
	[root],
).awaitStatus();
```

Given:

```ts
describe("block A", () => {
	it.todo("should test one");

	it.todo("should test two");
});

describe("block B", () => {
	it.todo("should test three");
});
```

- `"block A"` matches "test one" and "test two"
- `"block A test one"` matches only "test one"
- `"test one"` matches "test one" (and any other test containing "test one")

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/TestFiltering.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/CLI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Configuration.md
-->
