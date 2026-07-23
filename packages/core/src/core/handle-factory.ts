import type { InputHandle } from "../types/core";

/**
 * Handle allocator returned by {@link createHandleFactory}.
 */
export interface HandleFactory {
	/**
	 * Returns the next sequential handle, starting at 0.
	 *
	 * @returns A unique {@link InputHandle}.
	 */
	allocate(): InputHandle;
}

/**
 * Creates a monotonically increasing handle allocator.
 *
 * @returns A {@link HandleFactory} that produces unique, sequential handles.
 * @example
 * ```ts
 * const factory = createHandleFactory();
 * const first = factory.allocate(); // 0
 * const second = factory.allocate(); // 1
 * ```
 */
export function createHandleFactory(): HandleFactory {
	let nextIdentifier = 0;

	return {
		allocate(): InputHandle {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- InputHandle is an opaque brand over number; minting one from the counter is what this factory encapsulates
			const handle = nextIdentifier as unknown as InputHandle;
			nextIdentifier++;
			return handle;
		},
	};
}
