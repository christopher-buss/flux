---
name: Mock Functions
description: |
    Creating mocks with jest.fn(), jest.spyOn(), inspecting calls/returns, and
    configuring mock behavior.
---

# Mock Functions

## Import

```ts
import { expect, jest } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
```

## Creating Mocks

### `jest.fn()`

Returns **two values** (Lua deviation):

```ts
const [mock, mockFunc] = jest.fn();
```

- `mock` — callable table, use for assertions
- `mockFunc` — real function, pass to code requiring `type(x) == "function"`

If the code accepts callable tables, you only need the first:

```ts
const [mock] = jest.fn();
```

With an implementation:

```ts
const [mock] = jest.fn((x) => x * 2);

expect(mock(5)).toBe(10);
```

### `jest.spyOn(object, methodName)`

Creates a mock that wraps an existing method. **Calls the original by default**:

```ts
const video = { play: () => true };
const spy = jest.spyOn(video, "play");
afterThis(() => spy.mockRestore()); // restore original after test

video.play();
expect(spy).toHaveBeenCalled();
```

Override the implementation:

```ts
jest.spyOn(video, "play").mockImplementation(() => false);
```

## The `.mock` Property

Every mock tracks call data:

```ts
const [mock] = jest.fn();
mock("a", "b");
mock("c");

const { calls } = mock.mock; // [["a", "b"], ["c"]]
const { results } = mock.mock; // [{ type: "return", value: undefined }, ...]
const { instances } = mock.mock; // instances created via mock.new()
const { lastCall } = mock.mock; // ["c"]
```

## Configuring Return Values

```ts
const [mock] = jest.fn();

// Fixed return value
mock.mockReturnValue(42);
mock(); // 42

// Return specific values in sequence
mock.mockReturnValueOnce("first").mockReturnValueOnce("second").mockReturnValue("default");

mock(); // "first"
mock(); // "second"
mock(); // "default"
```

## Configuring Implementations

```ts
// One-time implementation
const [mock] = jest.fn((x: number) => x + 1);
mock.mockImplementationOnce(() => 99);
mock(); // 99
mock(1); // 2 (back to default)
```

## Mock Names

Improve error messages:

```ts
const mock = jest.fn()[0].mockName("fetchUser");
expect(mock).toHaveBeenCalledWith("user-1");
// Error: expect(fetchUser).toHaveBeenCalledWith("user-1")
```

## Resetting Mocks

| Method                 | Clears calls/results | Removes implementation |
| ---------------------- | -------------------- | ---------------------- |
| `mock.mockClear()`     | Yes                  | No                     |
| `mock.mockReset()`     | Yes                  | Yes                    |
| `jest.clearAllMocks()` | All mocks            | No                     |
| `jest.resetAllMocks()` | All mocks            | Yes                    |

Auto-clear before each test via config:

```ts
// jest.config.ts
export = { clearMocks: true };
```

## Constructor Mocking

Use `mockFn.new()` instead of JS `new mockFn()`:

```ts
const [mockClass] = jest.fn<object, []>();
const instance = new mockClass();

expect(mockClass.mock.instances[0]).toBe(instance);
```

## `.mockReturnThis()`

Makes the mock return itself on every call (useful for chaining):

```ts
const object = {
	method: jest.fn()[0].mockReturnThis(),
};

expect(object.method()).toBe(object);
```

## Asserting Mock Calls

```ts
const [mock] = jest.fn<void, [string]>();
mock("a");
mock("b");

expect(mock).toHaveBeenCalledTimes(2);
expect(mock).toHaveBeenCalledWith("a");
expect(mock).toHaveBeenLastCalledWith("b");
expect(mock).toHaveBeenNthCalledWith(1, "a");
```

Or inspect `.mock` directly:

```ts
expect(mock.mock.calls).toHaveLength(2);
expect(mock.mock.calls[0][0]).toBe("a");
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/MockFunctionAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/MockFunctions.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/JestObjectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Deviations.md
-->
