import { ContextError } from "../errors/context-error";
import type { ActionMap } from "../types/actions";
import type { BindingForAction, BindingState, TypedBindings } from "../types/bindings";
import type { ContextConfig } from "../types/contexts";
import type { FluxCore, InputHandle } from "../types/core";
import type { ActionState, ActionValue } from "../types/state";
import { createHandleFactory } from "./handle-factory";
import type { HandleData } from "./handle-lifecycle";
import {
	getHandleData,
	registerHandle,
	registerHandleAs,
	subscribeHandle,
	subscribeHandleAs,
} from "./handle-lifecycle";
import type { InputInstanceData } from "./input-instances";
import { addContextInstances, destroyInputInstances, setContextEnabled } from "./input-instances";
import { updateHandle } from "./update-handle";

/**
 * Options for creating a Flux core instance.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 */
export interface CreateCoreOptions<T extends ActionMap, C extends Record<string, ContextConfig>> {
	/** The action map defining available actions and their types. */
	readonly actions: T;
	/** Context configurations with validated bindings per action type. */
	readonly contexts: C & ValidatedContexts<T, C>;
	/**
	 * Enable debug warnings. Requires `_G.__DEV__` to also be `true` — when
	 * `_G.__DEV__` is `false`, debug code paths become dead code eligible
	 * for removal by code transformation tools.
	 * @default false
	 */
	readonly debug?: boolean;
}

/**
 * Validates that each context's bindings use the correct binding shape for each action type.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 */
type ValidatedContexts<T extends ActionMap, C extends Record<string, ContextConfig>> = {
	readonly [K in keyof C]: {
		readonly bindings: TypedBindings<T>;
		readonly priority: number;
		readonly sink?: boolean;
	};
};

/**
 * Creates a Flux core instance for managing input actions and contexts.
 * @template T - The action map type.
 * @template C - The context configuration record type.
 * @param options - Core creation options with actions and contexts.
 * @returns A fully initialized {@link FluxCore} instance.
 */
// eslint-disable-next-line max-lines-per-function -- thin delegation to helpers
export function createCore<T extends ActionMap, C extends Record<string, ContextConfig>>(
	options: CreateCoreOptions<T, C>,
): FluxCore<T, keyof C & string> {
	type Contexts = keyof C & string;
	const { actions, contexts, debug: isDebug } = options;
	// eslint-disable-next-line unused-imports/no-unused-vars, sonar/no-dead-store -- infrastructure for future dev warnings
	const isDevelopmentMode = _G.__DEV__ && isDebug === true;
	const factory = createHandleFactory();
	const handles = new Map<InputHandle, HandleData<T>>();

	// eslint-disable-next-line ts/no-empty-function -- intentional no-op
	const noop = (): void => {};

	return {
		addContext(handle: InputHandle, context: Contexts): () => void {
			validateContextName(contexts, context);
			const data = getHandleData(handles, handle);
			if (data.activeContexts.has(context)) {
				throw new ContextError(`context already active: ${context}`, context);
			}

			const cancel = (() => {
				if (data.instanceData.owned) {
					addContextInstances(context, contexts[context], actions, data.instanceData);
					return noop;
				}

				return findAndAddContext(context, data.instanceData);
			})();

			setContextEnabled(data.instanceData, context, true);
			data.activeContexts.add(context);

			return cancel;
		},
		destroy(): void {
			for (const [, data] of handles) {
				destroyInputInstances(data.instanceData);
			}

			handles.clear();
		},
		getContexts(handle: InputHandle): ReadonlyArray<Contexts> {
			const data = getHandleData(handles, handle);
			const result = new Array<Contexts>();
			for (const name of data.activeContexts) {
				result.push(name as Contexts);
			}

			return result;
		},
		getState(handle: InputHandle): ActionState<T> {
			return getHandleData(handles, handle).publicState;
		},
		hasContext(handle: InputHandle, context: Contexts): boolean {
			return getHandleData(handles, handle).activeContexts.has(context);
		},
		loadBindings(_handle: InputHandle, _data: BindingState<T>): void {
			error("Not implemented");
		},
		rebind<A extends keyof T & string>(
			_handle: InputHandle,
			_action: A,
			_bindings: ReadonlyArray<BindingForAction<T[A]["type"]>>,
		): void {
			error("Not implemented");
		},
		rebindAll(_handle: InputHandle, _bindings: BindingState<T>): void {
			error("Not implemented");
		},
		register(
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): InputHandle {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return registerHandle(factory, {
				actions,
				contextNames: [context, ...rest],
				contexts,
				handles,
				parent,
			});
		},
		registerAs(
			handle: InputHandle,
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): void {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			registerHandleAs(handle, {
				actions,
				contextNames: [context, ...rest],
				contexts,
				handles,
				parent,
			});
		},
		removeContext(handle: InputHandle, context: Contexts): void {
			const data = getHandleData(handles, handle);
			if (!data.activeContexts.has(context)) {
				throw new ContextError(`context not active: ${context}`, context);
			}

			setContextEnabled(data.instanceData, context, false);
			data.activeContexts.delete(context);
		},
		resetAllBindings(_handle: InputHandle): void {
			error("Not implemented");
		},
		resetBindings(_handle: InputHandle, _action: keyof T & string): void {
			error("Not implemented");
		},
		serializeBindings(_handle: InputHandle): BindingState<T> {
			error("Not implemented");
		},
		simulateAction<A extends keyof T & string>(
			handle: InputHandle,
			action: A,
			value: ActionValue<T, A>,
		): void {
			getHandleData(handles, handle).simulatedValues.set(action, value);
		},
		subscribe(parent: Instance, context: Contexts, ...rest: ReadonlyArray<Contexts>) {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return subscribeHandle(factory, {
				actions,
				contextNames: [context, ...rest],
				handles,
				parent,
			});
		},
		subscribeAs(
			handle: InputHandle,
			parent: Instance,
			context: Contexts,
			...rest: ReadonlyArray<Contexts>
		): () => void {
			validateContextName(contexts, context);
			for (const name of rest) {
				validateContextName(contexts, name);
			}

			return subscribeHandleAs(handle, {
				actions,
				contextNames: [context, ...rest],
				handles,
				parent,
			});
		},
		unregister(handle: InputHandle): void {
			const data = getHandleData(handles, handle);
			destroyInputInstances(data.instanceData);
			handles.delete(handle);
		},
		update(deltaTime: number): void {
			for (const [handle, handleData] of handles) {
				updateHandle({
					actions,
					contexts,
					deltaTime,
					handle,
					handleData,
				});
			}
		},
	};
}

function validateContextName(contexts: Record<string, ContextConfig>, name: string): void {
	if (contexts[name] === undefined) {
		throw new ContextError(`unknown context: ${name}`, name);
	}
}

function findContextInFolder(
	contextName: string,
	folder: Folder,
	inputContexts: Map<string, InputContext>,
	connections: Array<RBXScriptConnection>,
): void {
	const existing = folder.FindFirstChild(contextName);
	if (existing !== undefined && classIs(existing, "InputContext")) {
		inputContexts.set(contextName, existing);
		return;
	}

	const connection = folder.ChildAdded.Connect((child) => {
		if (child.Name !== contextName || !classIs(child, "InputContext")) {
			return;
		}

		inputContexts.set(contextName, child);
	});

	connections.push(connection);
}

function disconnectOwned(owned: Array<RBXScriptConnection>): void {
	for (const connection of owned) {
		connection.Disconnect();
	}
}

function findAndAddContext(contextName: string, data: InputInstanceData): () => void {
	const { connections, inputContexts, parent } = data;
	const owned: Array<RBXScriptConnection> = [];

	const folder = parent.FindFirstChild("input");
	if (folder !== undefined && classIs(folder, "Folder")) {
		findContextInFolder(contextName, folder, inputContexts, owned);
		for (const connection of owned) {
			connections.push(connection);
		}

		return () => {
			disconnectOwned(owned);
		};
	}

	const folderConnection = parent.ChildAdded.Connect((child) => {
		if (child.Name !== "input" || !classIs(child, "Folder")) {
			return;
		}

		findContextInFolder(contextName, child, inputContexts, owned);
		for (const connection of owned) {
			connections.push(connection);
		}
	});

	owned.push(folderConnection);
	connections.push(folderConnection);

	return () => {
		disconnectOwned(owned);
	};
}
