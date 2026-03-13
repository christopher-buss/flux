---
name: Timer Mocks
description: |
    Controlling time with fake timers for tick, task.delay, task.wait, os.time, DateTime, and
    engine frame time.
---

# Timer Mocks

## Import

```ts
import { expect, it, jest } from "@rbxts/jest-globals";
```

## Enable Fake Timers

```ts
jest.useFakeTimers();
```

Replaces these timers with fakes:

- `task.delay`, `task.cancel`, `task.wait`
- `os.time`, `os.clock`
- `DateTime`

Restore originals:

```ts
jest.useRealTimers();
```

## Running Timers

### `jest.runAllTimers()`

Execute all pending and subsequently scheduled timers:

```ts
jest.useFakeTimers();

it("should fire callback after delay", () => {
	expect.assertions(2);

	const [callback] = jest.fn();

	task.delay(1, callback);

	expect(callback).never.toHaveBeenCalled();

	jest.runAllTimers();

	expect(callback).toHaveBeenCalledTimes(1);
});
```

### `jest.runOnlyPendingTimers()`

Execute only currently pending timers (not newly scheduled ones). Use for
recursive timers to avoid infinite loops:

```ts
it("should handle recursive timer", () => {
	expect.assertions(1);

	const [callback] = jest.fn();

	task.delay(1, () => {
		callback();
		task.delay(10, () => {
			/* do something else */
		}); // schedules more
	});

	jest.runOnlyPendingTimers();

	expect(callback).toHaveBeenCalledTimes(1);
});
```

### `jest.advanceTimersByTime(ms)`

Advance time by a specific amount. Executes all timers due within that window:

```ts
jest.useFakeTimers();

it("should advance by 1 second", () => {
	expect.assertions(2);

	const [callback] = jest.fn();

	task.delay(1, callback);

	expect(callback).never.toHaveBeenCalled();

	jest.advanceTimersByTime(1);

	expect(callback).toHaveBeenCalledTimes(1);
});
```

### `jest.advanceTimersToNextTimer(steps?)`

Advance to the next scheduled timer. Optional `steps` to advance multiple
timers.

## Querying Timers

```ts
jest.getTimerCount(); // number of pending fake timers
```

## Clearing Timers

```ts
jest.clearAllTimers(); // remove all pending timers without executing
```

## System Time

```ts
jest.setSystemTime(1000); // set fake time (ms or DateTime)
jest.getRealSystemTime(); // get actual wall clock time
```

`setSystemTime` affects `DateTime.now()` and time functions but does not trigger
timer execution.

## Engine Frame Time (Roblox-Specific)

By default, fake timers run in continuous time. To simulate Roblox's frame-based
scheduler:

```ts
jest.setEngineFrameTime(1000 / 60); // ~16.67ms per frame

it("should process frame-based timer", () => {
	expect.assertions(1);

	const [callback] = jest.fn();
	task.delay(0.01, callback);

	// Advance by one frame
	jest.advanceTimersByTime(0);

	expect(callback).toHaveBeenCalledTimes(1);
});

jest.getEngineFrameTime(); // current frame time setting
```

Set to `0` for continuous time (default).

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/TimerMocks.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/JestObjectAPI.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Deviations.md
-->
