/** A binding-like value: KeyCode, UserInputType, or directional preset object. */
export type BindingLike = Enum.KeyCode | Enum.UserInputType | Record<string, Enum.KeyCode>;
