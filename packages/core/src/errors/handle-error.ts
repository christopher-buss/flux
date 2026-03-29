import { FluxError } from "./flux-error";

/**
 * Thrown when an operation references an unregistered or stale InputHandle.
 */
export class HandleError extends FluxError {
	public override readonly name = "HandleError";
}
