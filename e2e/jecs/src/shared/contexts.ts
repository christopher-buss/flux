import { defineContexts } from "@rbxts/flux";

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
		},
		priority: 0,
	},
});
