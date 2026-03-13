---
name: Async Testing
description: |
    Testing asynchronous code with Promises in Jest Roblox.
---

# Async Testing

## Import

```ts
import { expect, it } from "@rbxts/jest-globals";
```

## Promises

Return a Promise from the test function. Jest Roblox waits for it to
resolve/reject:

```ts
it("should fetch peanut butter", async () => {
	expect.assertions(1);

	const data = await fetchData();

	expect(data).toBe("peanut butter");
});
```

Tests can **only** return a `Promise` or `undefined`.

### `.resolves` / `.rejects`

Unwrap Promises inline. **Must return** the assertion:

```ts
it("should resolve to lemon", async () => {
	expect.assertions(1);

	await expect(Promise.resolve("lemon")).resolves.toBe("lemon");
});

it("should reject with error", async () => {
	expect.assertions(1);

	await expect(Promise.reject(new Error("fail"))).rejects.toThrow("fail");
});
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/TestingAsyncCode.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/ExpectAPI.md
-->
