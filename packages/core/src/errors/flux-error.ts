import { Error } from "./error";

/**
 * Base error for all Flux runtime failures.
 * @remarks Consumers can catch `FluxError` to handle any Flux-specific error.
 */
export class FluxError extends Error {
	public override readonly name: string = "FluxError";
}
