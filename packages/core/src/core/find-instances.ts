import type { ActionMap } from "../types/actions";
import type { InputInstanceData } from "./input-instances";
import { adoptContextInstances, INPUT_FOLDER_NAME } from "./input-instances";

interface FindInstancesOptions {
	readonly actions: ActionMap;
	readonly contextNames: ReadonlyArray<string>;
	readonly parent: Instance;
}

interface SearchOptions {
	readonly actions: ActionMap;
	readonly contextNames: ReadonlyArray<string>;
	readonly data: InputInstanceData;
	readonly folder: Instance;
}

/**
 * Finds existing IAS instances under the parent's "input" folder (server-created).
 * Uses FindFirstChild for already-present instances and ChildAdded for pending ones.
 * @param options - Context names and parent to search under.
 * @returns The discovered instance data and connections for cleanup.
 */
export function findInputInstances({
	actions,
	contextNames,
	parent,
}: FindInstancesOptions): InputInstanceData {
	const data: InputInstanceData = {
		actionsByContext: new Map<string, Map<string, InputAction>>(),
		connections: new Array<RBXScriptConnection>(),
		inputContexts: new Map<string, InputContext>(),
		instances: new Array<Instance>(),
		owned: false,
		parent,
	};

	const folder = parent.FindFirstChild(INPUT_FOLDER_NAME);
	if (folder !== undefined && classIs(folder, "Folder")) {
		searchForContexts({ actions, contextNames, data, folder });
	} else {
		const connection = parent.ChildAdded.Connect((child) => {
			if (child.Name !== INPUT_FOLDER_NAME || !classIs(child, "Folder")) {
				return;
			}

			searchForContexts({ actions, contextNames, data, folder: child });
		});

		data.connections.push(connection);
	}

	return data;
}

function searchForContexts({ actions, contextNames, data, folder }: SearchOptions): void {
	for (const contextName of contextNames) {
		const existing = folder.FindFirstChild(contextName);
		if (existing !== undefined && classIs(existing, "InputContext")) {
			adoptContextInstances(data, contextName, existing, actions);
			continue;
		}

		const connection = folder.ChildAdded.Connect((child) => {
			if (child.Name !== contextName || !classIs(child, "InputContext")) {
				return;
			}

			adoptContextInstances(data, contextName, child, actions);
		});

		data.connections.push(connection);
	}
}
