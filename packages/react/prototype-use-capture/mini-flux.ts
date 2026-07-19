/* eslint-disable flawless/naming-convention, jsdoc/require-jsdoc, jsdoc/require-returns, perfectionist/sort-classes, roblox/size-method, sonar/no-nested-incdec, ts/explicit-member-accessibility, ts/prefer-optional-chain -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — stub of the capture core per #153 (LIFO stack), #154 (release
// drain as capture-held-by-nobody), #155 (one-frame synthesized cancel),
// #156 (token = scoped reader). One Bool action: "confirm".

export interface CaptureEntry {
	id: number;
	label: string | undefined;
	/** Drain phantom per #154 — "held by nobody". */
	phantom: boolean;
}

export interface CaptureToken {
	canceled(): boolean;
	claim(): boolean;
	justPressed(): boolean;
	justReleased(): boolean;
	pressed(): boolean;
	release(): void;
}

export interface Reads {
	canceled: boolean;
	justPressed: boolean;
	justReleased: boolean;
	pressed: boolean;
}

const ANONYMOUS = -1;

export class MiniFlux {
	private rawDown = false;
	private previousRawDown = false;
	private rose = false;
	private fell = false;
	private stack: Array<CaptureEntry> = [];
	private nextId = 1;
	private claimed = false;
	private cancelTarget: number | undefined;
	private pendingCancel: number | undefined;

	press(): void {
		this.rawDown = true;
	}

	releaseDevice(): void {
		this.rawDown = false;
	}

	deviceDown(): boolean {
		return this.rawDown;
	}

	/** Frame start: clear claims, compute edges, expire drain, arm cancels. */
	update(): void {
		this.claimed = false;
		this.rose = this.rawDown && !this.previousRawDown;
		this.fell = !this.rawDown && this.previousRawDown;
		this.previousRawDown = this.rawDown;
		this.cancelTarget = this.pendingCancel;
		this.pendingCancel = undefined;
		if (!this.rawDown) {
			this.stack = this.stack.filter((entry) => !entry.phantom);
		}
	}

	capture(label?: string): CaptureToken {
		const displaced = this.top();
		if (displaced && !displaced.phantom) {
			this.pendingCancel = displaced.id;
		}

		const entry: CaptureEntry = { id: this.nextId++, label, phantom: false };
		this.stack.push(entry);
		return this.makeToken(entry.id);
	}

	debugCaptures(): ReadonlyArray<CaptureEntry> {
		return this.stack;
	}

	/** Anonymous (gameplay) reads — suppressed while anything holds the stack. */
	anonymousReads(): Reads {
		return this.readsFor(ANONYMOUS);
	}

	claimAnonymous(): boolean {
		if (this.readsReal(ANONYMOUS)) {
			this.claimed = true;
			return true;
		}

		return false;
	}

	readsFor(viewerId: number): Reads {
		const real = this.readsReal(viewerId) && !this.claimed;
		return {
			canceled: viewerId === this.cancelTarget && !this.claimed,
			justPressed: real && this.rose,
			justReleased: real && this.fell,
			pressed: real && this.rawDown,
		};
	}

	private readsReal(viewerId: number): boolean {
		const top = this.top();
		if (viewerId === ANONYMOUS) {
			return top === undefined;
		}

		return top !== undefined && top.id === viewerId;
	}

	private top(): CaptureEntry | undefined {
		return this.stack[this.stack.length - 1];
	}

	private releaseEntry(id: number): void {
		const index = this.stack.findIndex((entry) => entry.id === id);
		if (index === -1) {
			return;
		}

		const wasTop = index === this.stack.length - 1;
		this.stack.splice(index, 1);
		this.pendingCancel = id;
		if (wasTop && this.rawDown) {
			this.stack.push({ id: this.nextId++, label: "(drain)", phantom: true });
		}
	}

	private makeToken(id: number): CaptureToken {
		return {
			canceled: () => this.readsFor(id).canceled,
			claim: () => {
				if (this.readsReal(id) && !this.claimed) {
					this.claimed = true;
					return true;
				}

				return false;
			},
			justPressed: () => this.readsFor(id).justPressed,
			justReleased: () => this.readsFor(id).justReleased,
			pressed: () => this.readsFor(id).pressed,
			release: () => {
				this.releaseEntry(id);
			},
		};
	}
}
