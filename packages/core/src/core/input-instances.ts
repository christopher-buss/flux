import type { KeysOfUnion } from "type-fest";

import { FluxError } from "../errors";
import type { ActionConfig, ActionMap, ActionType } from "../types/actions";
import type { BindingConfig, BindingLike } from "../types/bindings";
import { DEFAULT_CONTEXT_PRIORITY } from "../types/contexts";
import type { ContextConfig } from "../types/contexts";
import { classifyBinding } from "./classify-binding";

/**
 * Stores all IAS instances for a single handle.
 * @see https://create.roblox.com/docs/reference/engine/classes/InputContext
 * @see https://create.roblox.com/docs/reference/engine/classes/InputAction
 */
export interface InputInstanceData {
	/** Active ChildAdded connections for cleanup. */
	readonly connections: Array<RBXScriptConnection>;
	/** Maps action names to their InputAction instances. */
	readonly inputActions: Map<string, InputAction>;
	/** Maps context names to their InputContext instances. */
	readonly inputContexts: Map<string, InputContext>;
	/** All created instances for bulk cleanup. */
	readonly instances: Array<Instance>;
	/** Whether this handle owns (created) the instances. */
	readonly owned: boolean;
	/** Parent instance the InputContexts live under. */
	readonly parent: Instance;
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
	readonly contextConfig: ContextConfig;
	readonly contextName: string;
	readonly inputActions: Map<string, InputAction>;
	readonly instances: Array<Instance>;
}

const INPUT_FOLDER_NAME = "input";

type BindingConfigKey = Extract<KeysOfUnion<BindingConfig>, string>;

type BindingProperty = WritablePropertyNames<InputBinding>;

interface FindInstancesOptions {
	readonly actions: ActionMap;
	readonly contextNames: ReadonlyArray<string>;
	readonly parent: Instance;
}
interface SearchState {
	readonly actions: ActionMap;
	readonly connections: Array<RBXScriptConnection>;
	readonly inputActions: Map<string, InputAction>;
	readonly inputContexts: Map<string, InputContext>;
}

/**
 * Creates all IAS instances for a handle's registered contexts.
 * @param options - Context names, context configs, and action configs.
 * @returns The created instance data for storage in handle data.
 */
export function createInputInstances(options: CreateInstancesOptions): InputInstanceData {
	const { actions, contextNames, contexts, parent } = options;
	const inputActions = new Map<string, InputAction>();
	const inputContexts = new Map<string, InputContext>();
	const instances = new Array<Instance>();
	const inputFolder = getOrCreateInputFolder(parent);

	for (const contextName of contextNames) {
		const contextConfig = contexts[contextName];
		assert(contextConfig, `missing context config: ${contextName}`);

		const inputContext = createContext({
			actions,
			contextConfig,
			contextName,
			inputActions,
			instances,
		});

		inputContext.Parent = inputFolder;
		inputContexts.set(contextName, inputContext);
	}

	return {
		connections: [],
		inputActions,
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
 * Finds existing IAS instances under the parent's "input" folder (server-created).
 * Uses FindFirstChild for already-present instances and ChildAdded for pending ones.
 * @param options - Context names and parent to search under.
 * @returns The discovered instance data and connections for cleanup.
 */
export function findInputInstances(options: FindInstancesOptions): InputInstanceData {
	const { actions, contextNames, parent } = options;
	const state = createSearchState(actions);

	const folder = parent.FindFirstChild(INPUT_FOLDER_NAME);
	if (folder !== undefined && classIs(folder, "Folder")) {
		searchForContexts(folder, contextNames, state);
	} else {
		const connection = parent.ChildAdded.Connect((child) => {
			if (child.Name !== INPUT_FOLDER_NAME || !classIs(child, "Folder")) {
				return;
			}

			searchForContexts(child, contextNames, state);
		});

		state.connections.push(connection);
	}

	return { ...state, instances: [], owned: false, parent };
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
		contextConfig,
		contextName,
		inputActions: data.inputActions,
		instances: data.instances,
	});

	const inputFolder = getOrCreateInputFolder(data.parent);
	inputContext.Parent = inputFolder;
	data.inputContexts.set(contextName, inputContext);
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

function createSearchState(actions: ActionMap): SearchState {
	return {
		actions,
		connections: new Array<RBXScriptConnection>(),
		inputActions: new Map<string, InputAction>(),
		inputContexts: new Map<string, InputContext>(),
	};
}

function collectActions(
	inputContext: InputContext,
	actions: ActionMap,
	inputActions: Map<string, InputAction>,
): void {
	for (const child of inputContext.GetChildren()) {
		if (
			classIs(child, "InputAction") &&
			actions[child.Name] !== undefined &&
			!inputActions.has(child.Name)
		) {
			inputActions.set(child.Name, child);
		}
	}
}

function searchForContexts(
	folder: Instance,
	contextNames: ReadonlyArray<string>,
	state: SearchState,
): void {
	for (const contextName of contextNames) {
		const existing = folder.FindFirstChild(contextName);
		if (existing !== undefined && classIs(existing, "InputContext")) {
			state.inputContexts.set(contextName, existing);
			collectActions(existing, state.actions, state.inputActions);
			continue;
		}

		const connection = folder.ChildAdded.Connect((child) => {
			if (child.Name !== contextName || !classIs(child, "InputContext")) {
				return;
			}

			state.inputContexts.set(contextName, child);
			collectActions(child, state.actions, state.inputActions);
		});

		state.connections.push(connection);
	}
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

const PROPERTY_MAP = {
	backward: "Backward",
	clampMagnitudeToOne: "ClampMagnitudeToOne",
	down: "Down",
	forward: "Forward",
	keyCode: "KeyCode",
	left: "Left",
	pointerIndex: "PointerIndex",
	pressedThreshold: "PressedThreshold",
	primaryModifier: "PrimaryModifier",
	releasedThreshold: "ReleasedThreshold",
	responseCurve: "ResponseCurve",
	right: "Right",
	scale: "Scale",
	secondaryModifier: "SecondaryModifier",
	uiButton: "UIButton",
	up: "Up",
	vector2Scale: "Vector2Scale",
	vector3Scale: "Vector3Scale",
} as const satisfies Record<BindingConfigKey, BindingProperty>;

function isKeyCode(value: BindingLike): value is Enum.KeyCode {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.KeyCode;
}

function isUserInputType(value: unknown): boolean {
	return typeIs(value, "EnumItem") && value.EnumType === Enum.UserInputType;
}

function createBinding(
	bindingLike: BindingLike,
	parent: InputAction,
	instances: Array<Instance>,
): void {
	if (isUserInputType(bindingLike)) {
		throw new FluxError(
			`UserInputType bindings are not supported: ${bindingLike}. Use Enum.KeyCode instead`,
		);
	}

	const binding = new Instance("InputBinding");
	binding.Name = classifyBinding(bindingLike);
	if (isKeyCode(bindingLike)) {
		binding.KeyCode = bindingLike;
	} else {
		for (const [key, value] of pairs(bindingLike)) {
			binding[PROPERTY_MAP[key]] = value;
		}
	}

	binding.Parent = parent;
	instances.push(binding);
}

function createBindingsForAction(
	bindings: ReadonlyArray<BindingLike>,
	parent: InputAction,
	instances: Array<Instance>,
): void {
	for (const bindingLike of bindings) {
		createBinding(bindingLike, parent, instances);
	}
}

function createAction(options: CreateActionOptions): InputAction {
	const { actionConfig, actionName, bindings, instances, parent } = options;
	const inputAction = new Instance("InputAction");
	inputAction.Name = actionName;
	inputAction.Type = toInputActionType(actionConfig.type);
	createBindingsForAction(bindings, inputAction, instances);
	inputAction.Parent = parent;
	instances.push(inputAction);
	return inputAction;
}

function createContext(options: CreateContextOptions): InputContext {
	const { actions, contextConfig, contextName, inputActions, instances } = options;
	const inputContext = new Instance("InputContext");
	inputContext.Name = contextName;
	inputContext.Priority = contextConfig.priority ?? DEFAULT_CONTEXT_PRIORITY;
	inputContext.Sink = contextConfig.sink === true;

	for (const [actionName, bindings] of pairs(contextConfig.bindings)) {
		const actionConfig = actions[actionName];
		if (actionConfig === undefined) {
			continue;
		}

		const inputAction = createAction({
			actionConfig,
			actionName,
			bindings,
			instances,
			parent: inputContext,
		});

		if (!inputActions.has(actionName)) {
			inputActions.set(actionName, inputAction);
		}
	}

	instances.push(inputContext);
	return inputContext;
}
