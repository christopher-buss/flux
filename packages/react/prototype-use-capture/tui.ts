/* eslint-disable flawless/naming-convention, id-length, no-console, roblox/size-method, ts/no-unused-expressions -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — terminal shell. Drive the capture stack by hand:
//   pnpm proto:use-capture

import { ConfirmToast, GameplayJump, PurchaseModal } from "./app.ts";
import { MiniFlux } from "./mini-flux.ts";
import { Runtime } from "./mini-react.ts";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const flux = new MiniFlux();
const runtime = new Runtime();
const log: Array<string> = [];
let frameNumber = 0;
let modalInteractive = true;
let toastClaims = false;

function pushLog(line: string): void {
	log.push(`${DIM}f${frameNumber}${RESET} ${line}`);
	if (log.length > 12) {
		log.shift();
	}
}

runtime.mount("GameplayJump", GameplayJump, { flux });
runtime.flush();

function tickFrame(): void {
	frameNumber++;
	flux.update();
	runtime.frame({ log: pushLog });
	runtime.fireSignal();
	runtime.flush();
}

function toggleModal(): void {
	if (runtime.isMounted("PurchaseModal")) {
		if (runtime.isMounted("ConfirmToast")) {
			runtime.unmount("ConfirmToast");
		}

		runtime.unmount("PurchaseModal");
		pushLog("~ unmounted PurchaseModal");
	} else {
		runtime.mount("PurchaseModal", PurchaseModal, {
			flux,
			interactive: modalInteractive,
			log: pushLog,
		});
		pushLog("~ mounted PurchaseModal");
	}

	runtime.flush();
}

function toggleToast(): void {
	if (runtime.isMounted("ConfirmToast")) {
		runtime.unmount("ConfirmToast");
		pushLog("~ unmounted ConfirmToast");
	} else {
		runtime.mount("ConfirmToast", ConfirmToast, {
			claimOnDispatch: toastClaims,
			flux,
			log: pushLog,
		});
		pushLog("~ mounted ConfirmToast");
	}

	runtime.flush();
}

function toggleInteractive(): void {
	modalInteractive = !modalInteractive;
	runtime.setProps("PurchaseModal", { flux, interactive: modalInteractive, log: pushLog });
	pushLog(`~ PurchaseModal.interactive = ${modalInteractive}`);
	runtime.flush();
}

function render(): void {
	console.clear();
	const stack = flux.debugCaptures();
	const stackView =
		stack.length === 0
			? `${DIM}(empty — gameplay reads through)${RESET}`
			: stack
					.map((entry, index) => {
						const marker = index === stack.length - 1 ? `${BOLD}<- top${RESET}` : "";
						return `  ${index}: ${entry.label ?? "?"}${entry.phantom ? " [drain]" : ""} ${marker}`;
					})
					.join("\n");

	console.log(`${BOLD}useCapture prototype${RESET}  ${DIM}frame ${frameNumber}  strict=${runtime.strictMode}  toastClaims=${toastClaims}${RESET}
${BOLD}device${RESET}   confirm ${flux.deviceDown() ? `${BOLD}HELD${RESET}` : `${DIM}up${RESET}`}
${BOLD}capture stack${RESET}
${stackView}
${BOLD}components${RESET}`);
	for (const c of runtime.describe()) {
		console.log(`  ${c.name} ${DIM}(renders: ${c.renderCount})${RESET} — ${c.view}`);
	}

	console.log(`${BOLD}log${RESET}`);
	for (const line of log) {
		console.log(`  ${line}`);
	}

	console.log(`
${BOLD}[f]${RESET}${DIM} tick frame ${RESET}${BOLD}[space]${RESET}${DIM} press/release confirm ${RESET}${BOLD}[1]${RESET}${DIM} modal ${RESET}${BOLD}[2]${RESET}${DIM} toast ${RESET}${BOLD}[e]${RESET}${DIM} modal.interactive${RESET}
${BOLD}[r]${RESET}${DIM} rerender all ${RESET}${BOLD}[s]${RESET}${DIM} StrictMode (next mounts) ${RESET}${BOLD}[c]${RESET}${DIM} toast claims on dispatch ${RESET}${BOLD}[q]${RESET}${DIM} quit${RESET}`);
}

const actions = new Map<string, () => void>([
	["1", toggleModal],
	["2", toggleToast],
	[
		" ",
		() => {
			flux.deviceDown() ? flux.releaseDevice() : flux.press();
			pushLog(
				`~ device confirm ${flux.deviceDown() ? "pressed" : "released"} (tick a frame)`,
			);
		},
	],
	[
		"c",
		() => {
			toastClaims = !toastClaims;
			runtime.setProps("ConfirmToast", { claimOnDispatch: toastClaims, flux, log: pushLog });
			runtime.flush();
		},
	],
	["e", toggleInteractive],
	["f", tickFrame],
	[
		"r",
		() => {
			runtime.rerenderAll();
			runtime.flush();
			pushLog("~ rerendered all");
		},
	],
	[
		"s",
		() => {
			runtime.strictMode = !runtime.strictMode;
		},
	],
]);

if (!process.stdin.isTTY) {
	console.error("Run from a real terminal (raw stdin needed): pnpm proto:use-capture");
	process.exit(1);
}

process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("data", (buffer: Buffer) => {
	const key = buffer.toString();
	if (key === "q" || key === "") {
		process.stdin.setRawMode(false);
		process.exit(0);
	}

	actions.get(key)?.();
	render();
});

render();
