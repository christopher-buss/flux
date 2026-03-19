// Stub -- full implementation in Phase 2.
export type TriggerState = "canceled" | "none" | "ongoing" | "triggered";

export interface Trigger {
	reset(): void;
	update(magnitude: number, duration: number, deltaTime: number): TriggerState;
}

export type TriggerType = "blocker" | "explicit" | "implicit";

export interface TypedTrigger {
	readonly trigger: Trigger;
	readonly type: TriggerType;
}
