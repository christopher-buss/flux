/* eslint-disable flawless/naming-convention, id-length, no-console, prefer-template, ts/strict-void-return -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — headless smoke drive (not a test). Run: node smoke.ts
import { ConfirmToast, GameplayJump, PurchaseModal } from "./app.ts";
import { MiniFlux } from "./mini-flux.ts";
import { Runtime } from "./mini-react.ts";

const flux = new MiniFlux();
const runtime = new Runtime();
const lines: Array<string> = [];
let frame = 0;

function tick(note: string): void {
	frame++;
	flux.update();
	runtime.frame({ log: (l) => lines.push(`f${frame} ${l}`) });
	runtime.flush();
	const stack = flux
		.debugCaptures()
		.map((entry) => entry.label + (entry.phantom ? "[drain]" : ""))
		.join(" < ");
	console.log(`f${frame} (${note}) stack=[${stack}]`);
	for (const l of lines.splice(0)) {
		console.log("   " + l);
	}
}

runtime.mount("GameplayJump", GameplayJump, { flux });
runtime.flush();

flux.press();
tick("press, no captures -> gameplay jumps");
flux.releaseDevice();
tick("release");

runtime.mount("PurchaseModal", PurchaseModal, { flux, interactive: true });
runtime.flush();
tick("modal mounted -> captured via effect");
flux.press();
tick("press -> modal buys, gameplay silent");
flux.releaseDevice();
tick("release");

runtime.mount("ConfirmToast", ConfirmToast, { claimOnDispatch: false, flux });
runtime.flush();
tick("toast mounted on top -> modal sees canceled");
flux.press();
tick("press -> toast OK, modal silent");

runtime.unmount("ConfirmToast");
runtime.flush();
tick("toast unmounted mid-press -> drain phantom, modal must NOT see press");
flux.releaseDevice();
tick("release -> drain expires");
flux.press();
tick("fresh press -> modal buys again");
flux.releaseDevice();
tick("release");

runtime.strictMode = true;
runtime.unmount("PurchaseModal");
runtime.flush();
runtime.mount("PurchaseModal", PurchaseModal, { flux, interactive: true });
runtime.flush();
tick("StrictMode remount -> exactly one live capture");
flux.press();
tick("press -> modal buys once, not twice");
