---
name: Snapshot Testing
description: Capturing and comparing snapshots for regression testing.
---

# Snapshot Testing

## Import

```ts
import { expect, it } from "@rbxts/jest-globals";
```

## Basic Usage

```ts
it("matches snapshot", () => {
	expect({
		a: 1,
		b: "test",
		c: ["array", "of", "strings"],
	}).toMatchSnapshot();
});
```

First run creates a `.snap.lua` file. Subsequent runs compare against it.

## Updating Snapshots

Pass `-u` or `--updateSnapshot` to update existing snapshots:

```bash
jest -u
jest --updateSnapshot
```

Or set in `jest.config.ts`:

```ts
export = {
	updateSnapshot: true,
};
```

New snapshots auto-create on first run (unless `CI` is set).

Combine with `testPathPattern` or `testNamePattern` to update specific
snapshots.

## Property Matchers

For generated/dynamic values, pass asymmetric matchers:

```ts
it("should match with dynamic fields", () => {
	expect.assertions(1);

	const user = {
		id: math.floor(math.random() * 20),
		name: "John Smith",
		createdAt: DateTime.now(),
	};

	expect(user).toMatchSnapshot({
		id: expect.any("number"),
		name: expect.any("string"),
		createdAt: expect.any("DateTime"),
	});
});
```

The matchers are checked first, then saved to the snapshot file as type
placeholders (e.g., `Any<number>`).

## Error Snapshots

```ts
it("should capture error message", () => {
	expect.assertions(1);

	expect(() => {
		error("something broke");
	}).toThrowErrorMatchingSnapshot();
});
```

## Snapshot Hints

Add a hint string to distinguish multiple snapshots in one test:

```ts
it("should capture multiple snapshots", () => {
	expect.assertions(2);

	expect(stateA).toMatchSnapshot("before update");
	expect(stateB).toMatchSnapshot("after update");
});
```

## Custom Serializers

Register per-file:

```ts
expect.addSnapshotSerializer({
	serialize: (value, ...args) => {
		const [config, indentation, depth, refs, printer] = args;
		return `Pretty foo: ${printer(value.foo, config, indentation, depth, refs, printer)}`;
	},
	test: (value) => typeIs(value, "table") && value.foo !== undefined,
});
```

Or in config:

```ts
export = {
	snapshotSerializers: [Workspace.mySerializer],
};
```

## Roblox Instance Snapshots

Configure formatting in `jest.config.ts`:

```ts
export = {
	snapshotFormat: {
		printInstanceDefaults: false, // omit default property values
		printInstanceTags: true, // show CollectionService tags
	},
};
```

## Custom Snapshot Matchers

Build matchers that delegate to snapshot testing:

```ts
import { toMatchSnapshot } from "@rbxts/jest-snapshot";

expect.extend({
	toMatchTrimmedSnapshot(received: string, length: number) {
		return toMatchSnapshot(this, received.sub(1, length), "toMatchTrimmedSnapshot");
	},
});
```

## Best Practices

- Commit snapshot files alongside tests
- Review snapshot diffs in PRs
- Keep snapshots small and focused
- Use property matchers for non-deterministic fields
- Use descriptive test names (they become snapshot keys)
- On CI, use `ci = true` to prevent auto-creating new snapshots

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/SnapshotTesting.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/ExpectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Configuration.md
-->
