import { defineContexts } from "@flux/core";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			fire: [Enum.KeyCode.MouseRightButton, Enum.KeyCode.ButtonR2],
			interact: [Enum.KeyCode.E, Enum.KeyCode.ButtonX],
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [
				{
					down: Enum.KeyCode.S,
					left: Enum.KeyCode.A,
					right: Enum.KeyCode.D,
					up: Enum.KeyCode.W,
				},
				{ keyCode: Enum.KeyCode.Thumbstick1 },
			],
			toggleContext: [Enum.KeyCode.F, Enum.KeyCode.ButtonStart],
		},
		priority: 0,
	},
	menu: {
		bindings: {
			toggleContext: [Enum.KeyCode.F, Enum.KeyCode.ButtonStart],
		},
		priority: 10,
		sink: true,
	},
});
