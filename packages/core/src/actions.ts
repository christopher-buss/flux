interface ActionState {
	pressed(action: string): boolean;
	simulateAction(action: string, value: boolean): void;
}

export function createActionState(
	actionNames: ReadonlyArray<string>,
	parent: Instance,
): ActionState {
	const actions = new Map<string, InputAction>();
	const state = new Map<string, boolean>();

	for (const name of actionNames) {
		const action = new Instance("InputAction");
		action.Parent = parent;
		action.Pressed.Connect(() => state.set(name, true));
		action.Released.Connect(() => state.set(name, false));
		actions.set(name, action);
		state.set(name, false);
	}

	return {
		pressed(action) {
			const isPressed = state.get(action);
			assert(isPressed !== undefined, `Action "${action}" not defined`);
			return isPressed;
		},
		simulateAction(action, value) {
			const inputAction = actions.get(action);
			assert(inputAction, `Action "${action}" not defined`);
			inputAction.Fire(value);
		},
	};
}
