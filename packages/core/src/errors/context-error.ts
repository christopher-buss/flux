import { FluxError } from "./flux-error";

/**
 * Thrown when a context operation references an unknown or invalid context.
 * @example
 * ```ts
 * try {
 *     core.addContext(handle, "ui");
 * } catch (caught) {
 *     if (caught instanceof ContextError) {
 *         warn(`Context problem: ${caught.context}`);
 *     }
 * }
 * ```
 */
export class ContextError extends FluxError {
	public readonly context: string;
	public override readonly name = "ContextError";

	/**
	 * Creates a new ContextError.
	 * @param message - A human-readable description of the error.
	 * @param context - The context name that caused the error.
	 */
	constructor(message: string, context: string) {
		super(message);
		this.context = context;
	}
}
