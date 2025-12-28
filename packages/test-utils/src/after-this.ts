import { afterEach, expect } from "@rbxts/jest-globals";
import { Array } from "@rbxts/luau-polyfill";

export type AfterThisCallback = (() => Promise<unknown>) | (() => unknown);

/**
 * Registers a callback to be executed after the current test completes.
 *
 * This function must be called within a Jest test environment and inside an
 * active test. The callback will be invoked after the test finishes, allowing
 * for cleanup or post-test operations.
 *
 * @example
 *
 * ```typescript
 * afterThis(() => {
 * 	// cleanup code
 * 	cleanup();
 * });
 * ```
 *
 * @param func - The callback function to execute after the test completes.
 * @rejects If called outside of a Jest test environment.
 * @rejects If called outside of an active test context.
 */
export function afterThis(func: AfterThisCallback): void {
	assert(isJest(), "The afterThis function can only be called in a jest test file.");

	// eslint-disable-next-line ts/no-unnecessary-condition -- Type incorrect outside jest environment
	if (expect.getState().currentTestName === undefined) {
		error("You can only use afterThis inside a test!");
	}

	pendingAfterThis.callbackStack.push(func);
}

const pendingAfterThis = {
	callbackStack: [] as Array<AfterThisCallback>,
	cleanCallbackStack() {
		this.callbackStack = [];
	},
};

async function handlePendingAfterThis(): Promise<void> {
	const reverseCallbacks = Array.reverse([...pendingAfterThis.callbackStack]);

	for (const callback of reverseCallbacks) {
		await callback();
	}

	pendingAfterThis.cleanCallbackStack();
}

function isJest(): boolean {
	// TODO: How to detect this?
	return true;
}

if (isJest()) {
	afterEach(handlePendingAfterThis);
}
