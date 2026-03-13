---
name: Module Mocking
description: |
    Mocking modules with jest.mock(), jest.unmock(), jest.requireActual(), and
    jest.isolateModules().
---

# Module Mocking

## Import

```ts
import { expect, jest } from "@rbxts/jest-globals";
```

## `jest.mock(module, factory)`

Replace a module with a mock when it's imported. The factory function is
**required** (unlike JS Jest):

```ts
jest.resetModules();

jest.mock<typeof import("src/my-module")>(Workspace.myModule, () => {
	return {
		default: jest.fn(() => 42)[0],
		helper: jest.fn(() => "mocked")[0],
	};
});

it("should use mocked module", async () => {
	expect.assertions(2);

	const myModule = await import("src/my-module");

	expect(myModule.default()).toBe(42);
	expect(myModule.helper()).toBe("mocked");
});
```

Mocks are scoped to the file that calls `jest.mock`. Other files importing the
same module get the real implementation.

## `jest.unmock(module)`

Remove a mock, restoring the real module:

```ts
jest.unmock(Workspace.myModule);
const real = await import("src/my-module");
```

## `jest.requireActual(module)`

Get the real module even when it's mocked:

```ts
jest.mock<typeof import("src/utils")>(Workspace.utils, () => {
	const actual = jest.requireActual<typeof import("src/utils")>(Workspace.utils);
	return {
		mockedFunc: jest.fn()[0],
		realFunc: actual.realFunc,
	};
});
```

## `jest.resetModules()`

Clear the module cache. Subsequent imports get fresh copies:

```ts
it("should get fresh module", async () => {
	expect.assertions(/* number of assertions */);

	jest.resetModules();
	const module = await import("src/stateful-module");
	// module is a fresh instance
});
```

## `jest.isolateModules(fn)`

Create a sandboxed module registry for the callback:

```ts
let isolated!: typeof import("src/my-module");
jest.isolateModules(() => {
	isolated = import("src/my-module").expect();
});

const normal = await import("src/my-module");

expect(isolated).never.toBe(normal); // different instances
```

Note: `isolateModules` takes a synchronous callback — use `import().expect()` to
synchronously unwrap the Promise instead of `await import()`.

## Chaining

Module mock functions return the `jest` object for chaining:

```ts
jest.mock<typeof import("src/a")>(Workspace.a, () => ({})).mock<typeof import("src/b")>(
	Workspace.b,
	() => ({}),
);
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/JestObjectAPI.md
-->
