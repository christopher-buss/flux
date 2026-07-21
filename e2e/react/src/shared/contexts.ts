import { defineContexts } from "@flux/core";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			cycleOverride: [Enum.KeyCode.P, Enum.KeyCode.ButtonY],
			fire: [Enum.KeyCode.MouseRightButton],
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
			],
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
