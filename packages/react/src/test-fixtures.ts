import type { ContextConfig } from "@rbxts/flux";
import {
	bool,
	defineActions,
	defineContexts,
	direction1d,
	direction2d,
	hold,
	implicit,
	tap,
} from "@rbxts/flux";

/** Seconds per frame used by integration tests. */
export const FRAME_TIME = 0.016;

/** Tap trigger threshold used by `dash` action. */
export const TAP_THRESHOLD = 0.2;

/** Hold trigger threshold used by `charge` action. */
export const HOLD_THRESHOLD = 0.5;

/** Hold trigger `attempting` window used by `charge` action. */
export const HOLD_ATTEMPTING = 0.1;

/**
 * Shared action map for react integration tests. Covers every action value
 * type the wrapper exposes plus one tap-wrapped and one hold-wrapped Bool.
 */
export const TEST_ACTIONS = defineActions({
	charge: bool({
		triggers: [implicit(hold({ attempting: HOLD_ATTEMPTING, threshold: HOLD_THRESHOLD }))],
	}),
	confirm: bool(),
	dash: bool({ triggers: [implicit(tap({ threshold: TAP_THRESHOLD }))] }),
	jump: bool(),
	move: direction2d(),
	throttle: direction1d(),
});

/**
 * Shared context map for react integration tests.
 *
 * - `gameplay` — low-priority base context.
 * - `ui` — higher priority with `sink` so it blocks `gameplay` bindings.
 * - `menu` — alternate context used for add/remove transitions.
 */
export const TEST_CONTEXTS = defineContexts({
	gameplay: {
		bindings: {
			charge: [Enum.KeyCode.E],
			dash: [Enum.KeyCode.Q],
			jump: [Enum.KeyCode.Space],
			move: [Enum.KeyCode.W],
			throttle: [Enum.KeyCode.R],
		},
		priority: 0,
	},
	menu: {
		bindings: {
			jump: [Enum.KeyCode.Return],
		},
		priority: 1,
	},
	ui: {
		bindings: {
			confirm: [Enum.KeyCode.Return],
		},
		priority: 10,
		sink: true,
	},
}) satisfies Record<string, ContextConfig>;
