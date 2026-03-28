import { defineContexts } from "@flux/core";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space],
			move: [
				{
					Backward: Enum.KeyCode.S,
					Forward: Enum.KeyCode.W,
					Left: Enum.KeyCode.A,
					Right: Enum.KeyCode.D,
				},
			],
			toggleContext: [Enum.KeyCode.Tab],
		},
		priority: 0,
	},
	menu: {
		bindings: {
			toggleContext: [Enum.KeyCode.Tab],
		},
		priority: 10,
		sink: true,
	},
});
