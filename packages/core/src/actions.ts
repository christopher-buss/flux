interface ActionState {
	pressed(action: string): boolean;
	simulateAction(action: string, value: boolean): void;
}

export function createActionState(): ActionState {
	const state = new Map<string, boolean>();

	return {
		pressed(action) {
			return state.get(action) ?? false;
		},
		simulateAction(action, value) {
			state.set(action, value);
		},
	};
}
