const DEFAULT_NAME = "Error";

type AnyFunction = (...args: Array<unknown>) => unknown;

/**
 * Base error with stack trace support for roblox-ts class inheritance.
 *
 * @remarks
 * Faithful port of the `@rbxts/luau-polyfill` Error with a `constructor`
 * method added so `class X extends Error` works at runtime.
 */
export class Error {
	public message: string;
	public name: string = DEFAULT_NAME;
	/** @internal */
	public rawStack = "";
	public stack?: string;

	/**
	 * Creates a new Error.
	 * @param message - A human-readable description of the error.
	 */
	constructor(message?: string) {
		this.name = DEFAULT_NAME;
		this.message = message ?? "";
		Error.internalCaptureStackTrace(this, 4);
	}

	/**
	 * Captures a filtered stack trace on an existing error instance.
	 * @param target - The error to capture the stack trace on.
	 * @param options - When provided, the stack trace starts after this
	 *   function's frame, hiding internal call sites from the trace.
	 */
	public static captureStackTrace(target: Error, options?: AnyFunction): void {
		Error.internalCaptureStackTrace(target, 3, options);
	}

	/**
	 * Returns a formatted string representation of the error.
	 * @returns The error formatted as `"Name: message"` or just `"Name"`.
	 */
	public toString(): string {
		if (this.message !== "") {
			return string.format("%*: %*", tostring(this.name), tostring(this.message));
		}

		return tostring(this.name);
	}

	private static internalCaptureStackTrace(
		target: Error,
		level: number,
		options?: AnyFunction,
	): void {
		if (options !== undefined) {
			const stack = debug.traceback(undefined, level);
			const [functionName] = debug.info(options, "n");
			const [sourceFilePath] = debug.info(options, "s");
			target.rawStack = filterStack(stack, sourceFilePath, functionName);
		} else {
			target.rawStack = debug.traceback(undefined, level);
		}

		Error.recalculateStacktrace(target);
	}

	private static recalculateStacktrace(target: Error): void {
		const { name, message, rawStack } = target;

		const errName = message !== "" ? `${name}: ${message}` : name;

		target.stack = `${errName}\n${rawStack}`;
	}
}

/**
 * Filters a stack trace by removing frames at and above the given function.
 * @param stack - Raw stack trace string.
 * @param sourcePath - Source file path of the target function.
 * @param functionName - Name of the target function.
 * @returns The filtered stack trace, or the original if no match found.
 */
export function filterStack(
	stack: string,
	sourcePath: string | undefined,
	functionName: string | undefined,
): string {
	if (sourcePath === undefined || functionName === undefined) {
		return stack;
	}

	const [escapedPath] = string.gsub(sourcePath, "([%(%)%.%%%+%-%*%?%[%^%$])", "%%%1");
	const pattern = `${escapedPath}:%d* function ${functionName}`;
	const [matchStart] = string.find(stack, pattern);
	if (matchStart !== undefined) {
		const [, lineEnd] = string.find(stack, "\n", matchStart + 1);
		if (lineEnd !== undefined) {
			return string.sub(stack, lineEnd + 1);
		}
	}

	return stack;
}
