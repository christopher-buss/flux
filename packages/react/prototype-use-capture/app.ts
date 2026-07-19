/* eslint-disable flawless/naming-convention, jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns, sonar/no-nested-conditional, ts/strict-boolean-expressions -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — example components, written the way a Roblox component author
// would write them against the candidate useCapture. React to THESE.

import type { MiniFlux } from "./mini-flux.ts";
import type { RenderResult } from "./mini-react.ts";
import { useCapture } from "./use-capture.ts";

export interface ModalProps {
	flux: MiniFlux;
	/** Condition-driven capture: modal mounted but not interactive yet. */
	interactive: boolean;
}

export interface ToastProps {
	/** Whether the toast claims after dispatching (suppresses #155 cancel). */
	claimOnDispatch: boolean;
	flux: MiniFlux;
}

/** Anonymous gameplay reader — no capture, reads through state as today. */
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

	return {
		onFrame: (api) => {
			if (confirm?.justPressed()) {
				api.log("PurchaseModal: BUY confirmed");
			}

			if (confirm?.canceled()) {
				api.log("PurchaseModal: canceled (displaced or released)");
			}
		},
		view: confirm
			? "holding capture"
			: props.interactive
				? "interactive, token pending"
				: "visible, not interactive",
	};
}

/** Nested widget mounted on top of the modal — LIFO shadows the modal. */
export function ConfirmToast(props: ToastProps): RenderResult {
	const confirm = useCapture(props.flux, "confirm", { debugLabel: "ConfirmToast" });

	return {
		onFrame: (api) => {
			if (confirm?.justPressed()) {
				api.log("ConfirmToast: OK");
				if (props.claimOnDispatch && confirm.claim()) {
					api.log("ConfirmToast: claimed rest of frame");
				}
			}

			if (confirm?.canceled()) {
				api.log("ConfirmToast: canceled");
			}
		},
		view: confirm ? "holding capture (top)" : "token pending",
	};
}
