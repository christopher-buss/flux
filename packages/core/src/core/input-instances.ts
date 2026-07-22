import type { ActionConfig, ActionMap, ActionType } from "../types/actions";
import type { BindingLike } from "../types/bindings";
import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { ContextConfig } from "../types/contexts";
import { requireContextConfig } from "./context-lookup";
import { createBindingsForAction } from "./input-bindings";

/**
 * Stores all IAS instances for a single handle.
 * @see https://create.roblox.com/docs/reference/engine/classes/InputContext
 * @see https://create.roblox.com/docs/reference/engine/classes/InputAction
 */
export interface InputInstanceData {
	/** Maps context names to that context's own InputAction instances. */
	readonly actionsByContext: Map<string, Map<string, InputAction>>;
	/** Active ChildAdded connections for cleanup. */
	readonly connections: Array<RBXScriptConnection>;
	/** Maps context names to their InputContext instances. */
	readonly inputContexts: Map<string, InputContext>;
	/** All created instances for bulk cleanup. */
	readonly instances: Array<Instance>;
	/** Whether this handle owns (created) the instances. */
	readonly owned: boolean;
	/** Parent instance the InputContexts live under. */
	readonly parent: Instance;
}

/** What backfilling an adopted context's missing actions needs. */
export interface FillContextOptions {
	/** The action map for looking up action configs. */
	readonly actions: ActionMap;
	/** The context's configuration, naming its declared actions. */
	readonly contextConfig: ContextConfig;
	/** The name of the context to backfill. */
	readonly contextName: string;
	/** The existing instance data to append to. */
	readonly data: InputInstanceData;
	/** The context's InputContext instance. */
	readonly inputContext: InputContext;
}

interface CreateInstancesOptions {
	readonly actions: ActionMap;
	readonly contextNames: ReadonlyArray<string>;
	readonly contexts: Record<string, ContextConfig>;
	readonly parent: Instance;
}

interface CreateActionOptions {
	readonly actionConfig: ActionConfig;
	readonly actionName: string;
	readonly bindings: ReadonlyArray<BindingLike>;
	readonly instances: Array<Instance>;
	readonly parent: InputContext;
}

interface CreateContextOptions {
	readonly actions: ActionMap;
	readonly actionsByContext: Map<string, Map<string, InputAction>>;
	readonly contextConfig: ContextConfig;
	readonly contextName: string;
	readonly instances: Array<Instance>;
}

interface PopulateActionsOptions {
	readonly actions: ActionMap;
	readonly contextConfig: ContextConfig;
	readonly declared: Map<string, InputAction>;
	readonly inputContext: InputContext;
	readonly instances: Array<Instance>;
}

/**
 * Name of the folder every handle parents its `InputContext` instances under.
 */
export const INPUT_FOLDER_NAME = "input";

/**
 * Creates all IAS instances for a handle's registered contexts.
 * @param options - Context names, context configs, and action configs.
 * @returns The created instance data for storage in handle data.
 */
export function createInputInstances({
	actions,
	contextNames,
	contexts,
	parent,
}: CreateInstancesOptions): InputInstanceData {
	const actionsByContext = new Map<string, Map<string, InputAction>>();
	const inputContexts = new Map<string, InputContext>();
	const instances = new Array<Instance>();
	const inputFolder = getOrCreateInputFolder(parent);

	for (const contextName of contextNames) {
		const contextConfig = requireContextConfig(contexts, contextName);
		const inputContext = createContext({
			actions,
			actionsByContext,
			contextConfig,
			contextName,
			instances,
		});

		inputContext.Parent = inputFolder;
		inputContexts.set(contextName, inputContext);
	}

	return {
		actionsByContext,
		connections: [],
		inputContexts,
		instances,
		owned: true,
		parent,
	};
}
/**
 * Destroys all IAS instances stored in the given data.
 * @param data - The instance data to clean up.
 */
export function destroyInputInstances(data: InputInstanceData): void {
	for (const connection of data.connections) {
		connection.Disconnect();
	}

	for (const instance of data.instances) {
		instance.Destroy();
	}
}

/**
 * Creates an InputContext instance for a newly added context.
 * @param contextName - The name of the context to add.
 * @param contextConfig - The context's configuration.
 * @param actions - The action map for looking up action configs.
 * @param data - The existing instance data to append to.
 */
export function addContextInstances(
	contextName: string,
	contextConfig: ContextConfig,
	actions: ActionMap,
	data: InputInstanceData,
): void {
	const inputContext = createContext({
		actions,
		actionsByContext: data.actionsByContext,
		contextConfig,
		contextName,
		instances: data.instances,
	});

	const inputFolder = getOrCreateInputFolder(data.parent);
	inputContext.Parent = inputFolder;
	data.inputContexts.set(contextName, inputContext);
}

/**
 * Adopts an InputContext that already exists under the parent, indexing its
 * `InputAction` children so reads can resolve to them.
 * @param data - The existing instance data to append to.
 * @param contextName - The name of the context being adopted.
 * @param inputContext - The already-present InputContext instance.
 * @param actions - The action map for filtering unknown action names.
 */
export function adoptContextInstances(
	data: InputInstanceData,
	contextName: string,
	inputContext: InputContext,
	actions: ActionMap,
): void {
	data.inputContexts.set(contextName, inputContext);
	const declared = getOrCreateContextActions(data.actionsByContext, contextName);
	for (const child of inputContext.GetChildren()) {
		if (classIs(child, "InputAction") && actions[child.Name] !== undefined) {
			declared.set(child.Name, child);
		}
	}
}

/**
 * Creates the declared `InputAction` instances a context is missing.
 *
 * Only an owning handle may call this: it leaves an adopted context with the
 * instance set creation would have given it, which is what reads assume when
 * they resolve an owned handle's actions.
 * @param options - The instance data, context to backfill, and action map.
 */
export function fillContextActions({
	actions,
	contextConfig,
	contextName,
	data,
	inputContext,
}: FillContextOptions): void {
	assert(data.owned, "cannot create instances for a handle that does not own them");
	populateContextActions({
		actions,
		contextConfig,
		declared: getOrCreateContextActions(data.actionsByContext, contextName),
		inputContext,
		instances: data.instances,
	});
}

/**
 * Finds an already-created `InputContext` instance for a context name under
 * the handle's parent, if the hierarchy already holds one.
 * @param contextName - The context to look for.
 * @param data - The handle's input instance data.
 * @returns The existing `InputContext`, or `undefined` when there is none.
 */
export function findExistingContext(
	contextName: string,
	data: InputInstanceData,
): InputContext | undefined {
	const folder = data.parent.FindFirstChild(INPUT_FOLDER_NAME);
	if (folder === undefined || !classIs(folder, "Folder")) {
		return undefined;
	}

	const existing = folder.FindFirstChild(contextName);
	if (existing !== undefined && classIs(existing, "InputContext")) {
		return existing;
	}

	return undefined;
}

/**
 * Sets the Enabled property on an InputContext instance.
 * @param data - The instance data containing context instances.
 * @param contextName - The context to enable or disable.
 * @param enabled - Whether the context should be enabled.
 */
export function setContextEnabled(
	data: InputInstanceData,
	contextName: string,
	enabled: boolean,
): void {
	const inputContext = data.inputContexts.get(contextName);
	if (inputContext !== undefined) {
		inputContext.Enabled = enabled;
	}
}

/**
 * Finds or creates the intermediary "input" folder under the given instance.
 * @param parent - The instance to place the folder under.
 * @returns The existing or newly created "input" folder.
 */
function getOrCreateInputFolder(parent: Instance): Folder {
	const existing = parent.FindFirstChild(INPUT_FOLDER_NAME);
	if (existing !== undefined && classIs(existing, "Folder")) {
		return existing;
	}

	const folder = new Instance("Folder");
	folder.Name = INPUT_FOLDER_NAME;
	folder.Parent = parent;
	return folder;
}

function getOrCreateContextActions(
	actionsByContext: Map<string, Map<string, InputAction>>,
	contextName: string,
): Map<string, InputAction> {
	let actions = actionsByContext.get(contextName);
	if (actions === undefined) {
		actions = new Map<string, InputAction>();
		actionsByContext.set(contextName, actions);
	}

	return actions;
}

/**
 * Maps an ActionType string to the corresponding Enum.InputActionType.
 * @param actionType - The action type string.
 * @returns The matching Enum.InputActionType value.
 * @see https://create.roblox.com/docs/reference/engine/enums/InputActionType
 */
function toInputActionType(actionType: ActionType): Enum.InputActionType {
	switch (actionType) {
		case "Bool": {
			return Enum.InputActionType.Bool;
		}
		case "Direction1D": {
			return Enum.InputActionType.Direction1D;
		}
		case "Direction2D": {
			return Enum.InputActionType.Direction2D;
		}
		case "Direction3D": {
			return Enum.InputActionType.Direction3D;
		}
		case "ViewportPosition": {
			return Enum.InputActionType.ViewportPosition;
		}
	}
}

function createAction({
	actionConfig,
	actionName,
	bindings,
	instances,
	parent,
}: CreateActionOptions): InputAction {
	const inputAction = new Instance("InputAction");
	inputAction.Name = actionName;
	inputAction.Type = toInputActionType(actionConfig.type);
	createBindingsForAction(bindings, inputAction, instances);
	inputAction.Parent = parent;
	instances.push(inputAction);
	return inputAction;
}

/** Creates an `InputAction` for every declared action not already indexed. */
function populateContextActions({
	actions,
	contextConfig,
	declared,
	inputContext,
	instances,
}: PopulateActionsOptions): void {
	for (const [actionName, bindings] of pairs(contextConfig.bindings)) {
		const actionConfig = actions[actionName];
		if (actionConfig === undefined || declared.has(actionName)) {
			continue;
		}

		declared.set(
			actionName,
			createAction({
				actionConfig,
				actionName,
				bindings,
				instances,
				parent: inputContext,
			}),
		);
	}
}

function createContext({
	actions,
	actionsByContext,
	contextConfig,
	contextName,
	instances,
}: CreateContextOptions): InputContext {
	const inputContext = new Instance("InputContext");
	inputContext.Name = contextName;
	inputContext.Priority = contextConfig.priority ?? DEFAULT_CONTEXT_PRIORITY;
	inputContext.Sink = contextConfig.sink === true;

	populateContextActions({
		actions,
		contextConfig,
		declared: getOrCreateContextActions(actionsByContext, contextName),
		inputContext,
		instances,
	});

	instances.push(inputContext);
	return inputContext;
}
