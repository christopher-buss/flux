/* eslint-disable flawless/naming-convention, jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns, sonar/no-nested-conditional -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — example components, written the way a Roblox component author
// would write them against the candidate useCapture. React to THESE.
// Dispatch is selector + useEffect (no useFrame hook exists in the stack);
// rendering (the view string) reads the same selectors.

import type { MiniFlux } from "./mini-flux.ts";
import type { RenderResult } from "./mini-react.ts";
import { useEffect } from "./mini-react.ts";
import { useCapture, useCaptureAction } from "./use-capture.ts";

export interface ModalProps {
	flux: MiniFlux;
	/** Condition-driven capture: modal mounted but not interactive yet. */
	interactive: boolean;
	log(line: string): void;
}

export interface ToastProps {
	/** Whether the toast claims after dispatching (suppresses #155 cancel). */
	claimOnDispatch: boolean;
	flux: MiniFlux;
	log(line: string): void;
}

/** Anonymous gameplay reader — a system outside React, reads state as today. */
export function GameplayJump(props: { flux: MiniFlux }): RenderResult {
	return {
		onFrame: (api) => {
			if (props.flux.anonymousReads().justPressed) {
				api.log("GameplayJump: jump!");
			}
		},
		view: "reads confirm anonymously",
	};
}

/** Per-widget capture (#153 idiom): owns confirm while interactive. */
export function PurchaseModal(props: ModalProps): RenderResult {
	const confirm = useCapture(props.flux, "confirm", {
		debugLabel: "PurchaseModal",
		enabled: props.interactive,
	});
	const justPressed = useCaptureAction(confirm, (token) => token.justPressed());
	const pressed = useCaptureAction(confirm, (token) => token.pressed());
	const canceled = useCaptureAction(confirm, (token) => token.canceled());

	useEffect(() => {
		if (justPressed) {
			props.log("PurchaseModal: BUY confirmed");
		}
	}, [justPressed]);

	useEffect(() => {
		if (canceled) {
			props.log("PurchaseModal: canceled (displaced or released)");
		}
	}, [canceled]);

	return {
		view: props.interactive
			? pressed
				? "[ BUY ] << held"
				: "[ BUY ]"
			: "visible, not interactive",
	};
}

/** Nested widget mounted on top of the modal — LIFO shadows the modal. */
export function ConfirmToast(props: ToastProps): RenderResult {
	const confirm = useCapture(props.flux, "confirm", { debugLabel: "ConfirmToast" });
	const justPressed = useCaptureAction(confirm, (token) => token.justPressed());
	const pressed = useCaptureAction(confirm, (token) => token.pressed());
	const canceled = useCaptureAction(confirm, (token) => token.canceled());

	useEffect(() => {
		if (justPressed) {
			props.log("ConfirmToast: OK");
			if (props.claimOnDispatch && confirm.claim()) {
				props.log("ConfirmToast: claimed rest of frame");
			}
		}
	}, [justPressed]);

	useEffect(() => {
		if (canceled) {
			props.log("ConfirmToast: canceled");
		}
	}, [canceled]);

	return { view: pressed ? "[ OK ] << held (top)" : "[ OK ] (top)" };
}
