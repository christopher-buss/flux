import { defineContexts } from "@rbxts/flux";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
			],
			swapJump: [Enum.KeyCode.R],
			toggleMenu: [Enum.KeyCode.M],
		},
		priority: 0,
	},
	menu: {
		bindings: {
			confirm: [Enum.KeyCode.Return],
			toggleMenu: [Enum.KeyCode.M],
		},
		priority: 10,
		sink: true,
	},
});
