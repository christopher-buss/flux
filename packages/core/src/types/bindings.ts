import type { ActionMap, AllActions } from "./actions";

/** A binding-like value: KeyCode, UserInputType, or directional preset object. */
export type BindingLike = Enum.KeyCode | Enum.UserInputType | Record<string, Enum.KeyCode>;

/**
 * Maps action names to their bound inputs. Used for serialization and rebinding.
 * @template Actions - The action map defining available action names.
 */
export type BindingState<Actions extends ActionMap = ActionMap> = Partial<
	Record<AllActions<Actions>, ReadonlyArray<BindingLike>>
>;
