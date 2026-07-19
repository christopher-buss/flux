/* eslint-disable arrow-style/arrow-return-style, cease-nonsense/prefer-early-return, flawless/naming-convention, id-length, jsdoc/require-jsdoc, perfectionist/sort-classes, perfectionist/sort-interfaces, perfectionist/sort-modules, perfectionist/sort-objects, perfectionist/sort-union-types, roblox/no-invalid-identifier, roblox/size-method, sonar/no-nested-incdec, ts/explicit-member-accessibility, ts/no-non-null-assertion, ts/prefer-optional-chain, ts/prefer-readonly, unicorn/prevent-abbreviations -- PROTOTYPE (#158): throwaway Node code, Roblox repo rules do not apply */
// PROTOTYPE — just-enough hook runtime: useState / useEffect / useRef,
// mount/unmount/rerender, optional StrictMode double-effect on mount.
// Components return { view, onFrame? }; onFrame closes over the last render.

export interface FrameApi {
	log(line: string): void;
}

export interface RenderResult {
	onFrame?(api: FrameApi): void;
	view: string;
}

type ComponentFn<P> = (props: P) => RenderResult;

interface EffectSlot {
	cleanup: (() => void) | undefined;
	deps: Array<unknown> | undefined;
	kind: "effect";
}

interface RefSlot {
	kind: "ref";
	ref: { current: unknown };
}

interface StateSlot {
	kind: "state";
	value: unknown;
}

interface SubscriptionSlot {
	compute: () => unknown;
	kind: "sub";
	last: unknown;
}

type HookSlot = EffectSlot | RefSlot | StateSlot | SubscriptionSlot;

interface Instance {
	dirty: boolean;
	fn: ComponentFn<unknown>;
	freshMount: boolean;
	name: string;
	pendingEffects: Array<{ effect: () => (() => void) | void; slot: EffectSlot }>;
	props: unknown;
	renderCount: number;
	result: RenderResult | undefined;
	slots: Array<HookSlot>;
}

let current: Instance | undefined;
let cursor = 0;

function slot<T extends HookSlot>(create: () => T): T {
	const instance = current;
	if (!instance) {
		throw new Error("hook outside render");
	}

	if (cursor >= instance.slots.length) {
		instance.slots.push(create());
	}

	return instance.slots[cursor++] as T;
}

export function useState<T>(initial: T | (() => T)): [T, (next: T) => void] {
	const instance = current!;
	const s = slot<StateSlot>(() => ({
		kind: "state",
		value: initial instanceof Function ? initial() : initial,
	}));
	return [
		s.value as T,
		(next) => {
			if (s.value !== next) {
				s.value = next;
				instance.dirty = true;
			}
		},
	];
}

export function useRef<T>(initial: T): { current: T } {
	return slot<RefSlot>(() => ({ kind: "ref", ref: { current: initial } })).ref as {
		current: T;
	};
}

/**
 * UseAction-style subscription: re-evaluated on every update signal.
 * @template R - The selected value type.
 * @param compute - Reads the current value; compared by identity on signal.
 * @returns The last computed value.
 */
export function useSubscription<R>(compute: () => R): R {
	const s = slot<SubscriptionSlot>(() => ({ compute, kind: "sub", last: compute() }));
	s.compute = compute;
	return s.last as R;
}

function depsChanged(a: Array<unknown> | undefined, b: Array<unknown> | undefined): boolean {
	if (a === undefined || b === undefined || a.length !== b.length) {
		return true;
	}

	return a.some((value, index) => value !== b[index]);
}

export function useEffect(effect: () => (() => void) | void, deps?: Array<unknown>): void {
	const instance = current!;
	const s = slot<EffectSlot>(() => ({ cleanup: undefined, deps: undefined, kind: "effect" }));
	if (s.deps !== undefined && !depsChanged(s.deps, deps)) {
		return;
	}

	s.deps = deps;
	instance.pendingEffects.push({ effect, slot: s });
}

export class Runtime {
	strictMode = false;
	private instances = new Map<string, Instance>();

	mount<P>(name: string, fn: ComponentFn<P>, props: P): void {
		this.instances.set(name, {
			dirty: true,
			fn: fn as ComponentFn<unknown>,
			freshMount: true,
			name,
			pendingEffects: [],
			props,
			renderCount: 0,
			result: undefined,
			slots: [],
		});
	}

	setProps(name: string, props: unknown): void {
		const instance = this.instances.get(name);
		if (instance) {
			instance.props = props;
			instance.dirty = true;
		}
	}

	unmount(name: string): void {
		const instance = this.instances.get(name);
		if (!instance) {
			return;
		}

		// React unmounts run cleanups in order for a single component.
		for (const s of instance.slots) {
			if (s.kind === "effect") {
				s.cleanup?.();
				s.cleanup = undefined;
			}
		}

		this.instances.delete(name);
	}

	isMounted(name: string): boolean {
		return this.instances.has(name);
	}

	rerenderAll(): void {
		for (const instance of this.instances.values()) {
			instance.dirty = true;
		}
	}

	/** Render dirty components, then run their effects (like a React flush). */
	flush(): void {
		let guard = 0;
		while ([...this.instances.values()].some((index) => index.dirty) && guard++ < 10) {
			for (const instance of this.instances.values()) {
				if (instance.dirty) {
					this.render(instance);
				}
			}

			for (const instance of this.instances.values()) {
				this.runEffects(instance);
			}
		}
	}

	frame(api: FrameApi): void {
		for (const instance of this.instances.values()) {
			instance.result?.onFrame?.(api);
		}
	}

	/** The wrapper's update signal: re-run subscriptions, dirty on change. */
	fireSignal(): void {
		for (const instance of this.instances.values()) {
			for (const s of instance.slots) {
				if (s.kind === "sub") {
					const next = s.compute();
					if (next !== s.last) {
						s.last = next;
						instance.dirty = true;
					}
				}
			}
		}
	}

	describe(): Array<{ name: string; renderCount: number; view: string }> {
		return [...this.instances.values()].map((instance) => ({
			name: instance.name,
			renderCount: instance.renderCount,
			view: instance.result?.view ?? "(not rendered)",
		}));
	}

	private render(instance: Instance): void {
		current = instance;
		cursor = 0;
		instance.dirty = false;
		instance.renderCount++;
		instance.result = instance.fn(instance.props);
		current = undefined;
	}

	private runEffects(instance: Instance): void {
		const doubleInvoke = this.strictMode && instance.freshMount;
		instance.freshMount = false;
		for (const { effect, slot: s } of instance.pendingEffects) {
			s.cleanup?.();
			s.cleanup = effect() ?? undefined;
			if (doubleInvoke) {
				s.cleanup?.();
				s.cleanup = effect() ?? undefined;
			}
		}

		instance.pendingEffects = [];
	}
}
