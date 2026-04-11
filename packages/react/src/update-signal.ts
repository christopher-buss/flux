/**
 * Callback type for update signal subscribers.
 */
export type UpdateListener = () => void;

/**
 * Disconnect function returned by subscribe.
 */
export type Disconnect = () => void;

/**
 * Internal signal for notifying React hooks that ActionState has been updated.
 */
export interface UpdateSignal {
	/**
	 * Fire the signal, notifying all subscribers.
	 */
	readonly fire: () => void;

	/**
	 * Subscribe to updates.
	 * @returns A disconnect function.
	 */
	readonly subscribe: (listener: UpdateListener) => Disconnect;
}

/**
 * Creates an update signal for notifying React hooks of ActionState changes.
 * @returns An UpdateSignal instance.
 */
export function createUpdateSignal(): UpdateSignal {
	const listeners = new Set<UpdateListener>();

	return {
		fire: () => {
			for (const listener of listeners) {
				listener();
			}
		},

		subscribe: (listener: UpdateListener): Disconnect => {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
	};
}
