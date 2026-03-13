---
name: testing
description: |
    Use when setting up Jest-roblox or applying TDD in roblox-ts projects
metadata:
    author: Christopher Buss
    version: "2026.1.29"
---

# Testing

## Philosophy

**Test-Driven Development (TDD)** - Write tests first, then implementation.

1. Write a failing test
2. Write minimal code to pass
3. Refactor

## Jest-roblox

Use [jest-roblox](https://github.com/Roblox/jest-roblox) for testing.

```bash
ni -D @rbxts/jest @rbxts/jest-globals
```

## File Conventions

Place test files next to source:

```text
src/
├── services/
│   ├── player-service.ts
│   └── player-service.spec.ts
```

Use `.spec.ts` suffix for test files.

## Test Structure

```ts
import { describe, expect, it } from "@rbxts/jest-globals";

describe("PlayerService", () => {
	describe("getPlayer", () => {
		it("should return player by id", () => {
			expect.assertions(1);

			// Arrange
			// Act
			// Assert
			expect(result).toBeDefined();
		});
	});
});
```

## Running Tests

```bash
nr test
```
