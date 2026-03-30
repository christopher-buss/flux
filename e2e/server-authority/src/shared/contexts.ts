import { defineContexts } from "@flux/core";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
			],
			toggleContext: [Enum.KeyCode.F],
		},
		priority: 0,
	},
	menu: {
		bindings: {
			toggleContext: [Enum.KeyCode.F],
		},
		priority: 10,
		sink: true,
	},
});
