import type { ActionMap } from "../types/actions";
import type { ContextConfig } from "../types/contexts";
import type { InputHandle } from "../types/core";
import { activateContext, isContextActive } from "./active-contexts";
import { validateContextName } from "./context-lookup";
import type { ReplicationTransport } from "./create-core-options";
import type { HandleData } from "./handle-lifecycle";
import { getHandleData } from "./handle-lifecycle";
import {
	addContextInstances,
	adoptContextInstances,
	fillContextActions,
	findExistingContext,
	setContextEnabled,
} from "./input-instances";
import { replayOverridesIntoContext } from "./rebinding";

/**
 * What activating a context on a handle needs from the core.
 * @template T - The action map type.
 */
export interface AddContextOptions<T extends ActionMap> {
	/** The core's full action map. */
	readonly actions: T;
	/** The context name to activate. */
	readonly context: string;
	/** Core context config record. */
	readonly contexts: Record<string, ContextConfig>;
	/** The handle to activate the context for. */
	readonly handle: InputHandle;
	/** Every registered handle's state. */
	readonly handles: Map<InputHandle, HandleData<T>>;
	/** The core's replication transport, or `undefined` when it has none. */
	readonly replicationTransport: ReplicationTransport | undefined;
}

interface ProvisionOptions<T extends ActionMap> {
	readonly actions: T;
	readonly context: string;
	readonly contextConfig: ContextConfig;
	readonly contexts: Record<string, ContextConfig>;
	readonly data: HandleData<T>;
}

/**
 * Activates a context for one handle, creating or adopting its instances.
 *
 * A context the handle has never carried gets instances first: an existing set
 * elsewhere in the hierarchy is adopted, and otherwise a fresh set is built.
 * Either way the handle's stored overrides are replayed into the context, so a
 * rebind made before the context was active still applies when it becomes
 * active. Replaying into adopted instances rewrites what the handle that
 * created them also reads, which is what sharing a context already means. An
 * owning handle backfills the declared actions an adopted context lacks,
 * because reads assume it can resolve every action its contexts declare.
 * @template T - The action map type.
 * @param options - The handle, context name, action map and context config.
 * @throws If the context name is unknown, the handle is not registered, the
 * context is already active, or the handle is subscribed under native
 * replication.
 */
export function addHandleContext<T extends ActionMap>({
	actions,
	context,
	contexts,
	handle,
	handles,
	replicationTransport,
}: AddContextOptions<T>): void {
	const contextConfig = validateContextName(contexts, context);
	const data = getHandleData(handles, handle);
	if (isContextActive(data.activeContexts, context)) {
		error(`context already active: ${context}`);
	}

	assert(
		data.instanceData.owned || replicationTransport !== "native",
		"cannot call addContext on a subscribed handle with native replication",
	);

	if (!data.instanceData.inputContexts.has(context)) {
		provisionContextInstances({ actions, context, contextConfig, contexts, data });
	}

	setContextEnabled(data.instanceData, context, true);
	activateContext(data.activeContexts, context);
}

function provisionContextInstances<T extends ActionMap>({
	actions,
	context,
	contextConfig,
	contexts,
	data,
}: ProvisionOptions<T>): void {
	const existing = findExistingContext(context, data.instanceData);
	if (existing === undefined) {
		addContextInstances(context, contextConfig, actions, data.instanceData);
	} else {
		adoptContextInstances(data.instanceData, context, existing, actions);
		if (data.instanceData.owned) {
			fillContextActions({
				actions,
				contextConfig,
				contextName: context,
				data: data.instanceData,
				inputContext: existing,
			});
		}
	}

	replayOverridesIntoContext({ contextName: context, contexts, handleData: data });
}
