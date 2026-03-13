---
name: Global Mocks
description: |
    Mocking global Luau functions like print() and math.random() using
    jest.globalEnv.
---

# Global Mocks

## Import

```ts
import { expect, it, jest } from "@rbxts/jest-globals";
```

## Mocking Global Functions

Use `jest.spyOn()` with `jest.globalEnv` to mock globals like `print()`:

```ts
it("should capture print output", () => {
	expect.assertions(1);

	const mockPrint = jest.spyOn(jest.globalEnv, "print");
	mockPrint.mockImplementation(() => {
		/* no-op */
	});

	print("hello");

	expect(mockPrint).toHaveBeenCalledWith("hello");
});
```

## Mocking Library Functions

Index into `jest.globalEnv` to access libraries like `math`:

```ts
it("should mock math.random", () => {
	expect.assertions(1);

	const mockRandom = jest.spyOn(jest.globalEnv.math, "random");
	mockRandom.mockReturnValue(5);

	expect(math.random(1, 6)).toBe(5);
});
```

## Accessing Original Implementations

The original (unmocked) functions are available on `jest.globalEnv`:

```ts
const mockRandom = jest.spyOn(jest.globalEnv.math, "random");
mockRandom.mockReturnValue(5);

math.random(); // 5 (mocked)
jest.globalEnv.math.random(); // actual random number (original)
```

## Limitations

Jest Roblox only supports mocking **whitelisted** globals. These are **not**
supported:

- `game:GetService()` and Instance methods — use
  `jest.spyOn(game, "GetService")` with `mockDataModel` enabled instead
- `require()` — use `jest.mock()` instead
- Task scheduling (`task.delay`, etc.) — use `jest.useFakeTimers()` instead

Attempting to mock a non-whitelisted global produces an error:

```text
Jest does not yet support mocking the require global.
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/GlobalMocks.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/JestObjectAPI.md
-->
