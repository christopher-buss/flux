import { batchSync } from "./batch-sync";

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
	 *
	 * Every subscriber is notified inside one {@link batchSync}, so the hooks
	 * reading through the store shim and the hooks subscribing here directly
	 * land in the same commit.
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

	/** Runs every listener. Hoisted to keep firing free of allocation. */
	const notifyAll = (): void => {
		for (const listener of listeners) {
			listener();
		}
	};

	return {
		fire: () => {
			// A game drives `flush()` off Heartbeat, so this runs every frame
			// whether or not any Flux hook is mounted. Entering a batch with
			// nothing to notify would still cost a protected call and a priority
			// save/restore.
			if (listeners.isEmpty()) {
				return;
			}

			batchSync(notifyAll);
		},

		subscribe: (listener: UpdateListener): Disconnect => {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
	};
}
