import { defineContexts } from "@flux/core";

export const contexts = defineContexts({
	gameplay: {
		bindings: {
			// Chord: C only fires while LeftControl + LeftShift are held.
			chord: [
				{
					keyCode: Enum.KeyCode.C,
					primaryModifier: Enum.KeyCode.LeftControl,
					secondaryModifier: Enum.KeyCode.LeftShift,
				},
			],
			fire: [Enum.KeyCode.MouseRightButton],
			interact: [Enum.KeyCode.E],
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
