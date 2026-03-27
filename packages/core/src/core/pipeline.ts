import type { ModifierContext, ModifierValue } from "../modifiers/types";
import type { TriggerState, TypedTrigger } from "../triggers/types";
import type { ActionConfig } from "../types/actions";
import { getMagnitude } from "./action-state";
import type { ActionValueType } from "./action-state";

/** Result of processing a single action through the modifier/trigger pipeline. */
export interface PipelineResult {
	/** The resolved trigger state after evaluating all triggers. */
	triggerState: TriggerState;
	/** The post-modifier value. */
	value: ActionValueType;
}

/** Options for processing a single action through the pipeline. */
export interface PipelineOptions {
	/** The action configuration containing modifiers and triggers. */
	readonly actionConfig: ActionConfig;
	/** Time elapsed since last frame in seconds. */
	readonly deltaTime: number;
	/** How long the input has been held in seconds. */
	readonly duration: number;
	/** Runtime context passed to modifiers. */
	readonly modifierContext: ModifierContext;
	/** The raw input value before any processing. */
	readonly rawValue: ActionValueType;
}

interface TriggerTally {
	bestState: TriggerState;
	hasBlocker: boolean;
	hasExplicitTriggered: boolean;
	hasImplicit: boolean;
	isAllImplicitTriggered: boolean;
}

/**
 * Processes a single action through the modifier and trigger pipeline.
 *
 * Applies modifiers in order, computes magnitude, evaluates triggers,
 * and resolves the final trigger state.
 *
 * @param options - Pipeline processing options.
 * @returns The post-modifier value and resolved trigger state.
 */
export function processPipeline(options: PipelineOptions): PipelineResult {
	const { actionConfig, deltaTime, duration, modifierContext, rawValue } = options;

	const value = applyModifiers(rawValue, actionConfig, modifierContext);
	const magnitude = getMagnitude(value);
	const triggerState = resolveTriggers(actionConfig, magnitude, duration, deltaTime);

	return { triggerState, value };
}

function applyModifiers(
	value: ActionValueType,
	actionConfig: ActionConfig,
	modifierContext: ModifierContext,
): ActionValueType {
	if (actionConfig.type === "Bool") {
		return value;
	}

	const { modifiers } = actionConfig;
	if (modifiers === undefined || modifiers.size() === 0) {
		return value;
	}

	let current = value as ModifierValue;
	for (const modifier of modifiers) {
		current = modifier.modify(current as never, modifierContext) as ModifierValue;
	}

	return current as ActionValueType;
}

function createTriggerTally(): TriggerTally {
	return {
		bestState: "none",
		hasBlocker: false,
		hasExplicitTriggered: false,
		hasImplicit: false,
		isAllImplicitTriggered: true,
	};
}

function combineTriggerStates(current: TriggerState, incoming: TriggerState): TriggerState {
	if (incoming === "ongoing" && current === "none") {
		return "ongoing";
	}

	if (incoming === "canceled" && current === "none") {
		return "canceled";
	}

	return current;
}

function tallyTriggerResults(
	triggers: ReadonlyArray<TypedTrigger>,
	magnitude: number,
	duration: number,
	deltaTime: number,
): TriggerTally {
	const tally = createTriggerTally();

	for (const typedTrigger of triggers) {
		const state = typedTrigger.trigger.update(magnitude, duration, deltaTime);

		if (typedTrigger.type === "blocker") {
			tally.hasBlocker ||= state === "triggered";
		} else if (typedTrigger.type === "explicit") {
			tally.hasExplicitTriggered ||= state === "triggered";
			tally.bestState = combineTriggerStates(tally.bestState, state);
		} else {
			tally.hasImplicit = true;
			tally.isAllImplicitTriggered &&= state === "triggered";
			tally.bestState = combineTriggerStates(tally.bestState, state);
		}
	}

	return tally;
}

function resolveFromTally(tally: TriggerTally): TriggerState {
	if (tally.hasBlocker) {
		return "none";
	}

	if (tally.hasExplicitTriggered) {
		return "triggered";
	}

	if (tally.hasImplicit && tally.isAllImplicitTriggered) {
		return "triggered";
	}

	return tally.bestState;
}

function resolveTriggers(
	actionConfig: ActionConfig,
	magnitude: number,
	duration: number,
	deltaTime: number,
): TriggerState {
	const { triggers } = actionConfig;
	if (triggers === undefined || triggers.size() === 0) {
		return magnitude > 0 ? "triggered" : "none";
	}

	const tally = tallyTriggerResults(triggers, magnitude, duration, deltaTime);

	return resolveFromTally(tally);
}
