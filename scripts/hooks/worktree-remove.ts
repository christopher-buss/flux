import { spawnSync } from "node:child_process";
import process from "node:process";
import type { JsonObject, JsonValue } from "type-fest";

/** Outcome of running an external command. */
export interface SpawnResult {
	/** Set when the command could not be launched at all (e.g. `ENOENT`). */
	readonly error?: Error | undefined;
	/** Exit code, or `null` when the command never ran or was signalled. */
	readonly status: null | number;
	/** Captured stdout; `undefined` when the command never ran. */
	readonly stdout?: string;
}

/** Runs an external command and reports how it went. */
export type SpawnFunc = (command: string, args: ReadonlyArray<string>) => SpawnResult;

/** Injected collaborators for {@link runWorktreeRemove}. */
export interface RunDependencies {
	/** Node platform identifier, used to pick the worktrunk binary. */
	readonly platform: NodeJS.Platform;
	/** Spawn function bound to the project directory. */
	readonly spawn: SpawnFunc;
	/** Raw JSON payload Claude Code writes to the hook's stdin. */
	readonly stdin: string;
}

/** What the hook process should exit with. */
export interface RunResult {
	/** Process exit code: 0 on success, 1 on any failure. */
	readonly code: 0 | 1;
}

/**
 * Resolve the worktrunk executable for the current platform.
 *
 * On Windows, plain `wt` can resolve to Windows Terminal's `wt.exe` shim
 * instead of worktrunk; `git-wt.exe` is unambiguous. Elsewhere `wt` is correct.
 * @param platform - Node platform identifier (e.g. `process.platform`).
 * @returns The executable name to spawn.
 */
export function worktrunkBinary(platform: NodeJS.Platform): string {
	return platform === "win32" ? "git-wt.exe" : "wt";
}

/**
 * Build the worktrunk arguments that tear down a worktree.
 * @param worktreePath - Absolute path of the worktree to remove.
 * @returns Arguments for `wt`.
 */
export function buildWtArgs(worktreePath: string): ReadonlyArray<string> {
	// --force removes a dirty worktree instead of failing; --foreground blocks
	// until cleanup finishes; --yes skips approval in this non-interactive hook.
	return ["remove", worktreePath, "--foreground", "--force", "--yes"];
}

/**
 * Read the worktree path out of the hook's stdin payload.
 * @param raw - Raw stdin contents.
 * @returns The path, or `undefined` when the payload is missing or malformed.
 */
export function parseWorktreePath(raw: string): string | undefined {
	return readJsonStringField(raw, "worktree_path");
}

/**
 * Remove a worktree via worktrunk, logging why on failure.
 * @param spawn - Spawn function bound to the project directory.
 * @param binary - Worktrunk executable from {@link worktrunkBinary}.
 * @param worktreePath - Absolute path of the worktree to remove.
 * @returns Whether the removal succeeded.
 */
export function removeWorktree(spawn: SpawnFunc, binary: string, worktreePath: string): boolean {
	const result = spawn(binary, buildWtArgs(worktreePath));
	if (result.error !== undefined) {
		console.error(
			`worktree-remove: failed to spawn ${binary} (${result.error.message}); is worktrunk installed?`,
		);
		return false;
	}

	if (result.status !== 0) {
		console.error(
			`worktree-remove: ${binary} remove ${worktreePath} failed (exit ${result.status})`,
		);
		return false;
	}

	return true;
}

/**
 * Run the WorktreeRemove hook: parse stdin, then hand the worktree to
 * worktrunk.
 * @param dependencies - Injected platform, spawn, and stdin.
 * @returns The exit code for the hook process.
 */
export function runWorktreeRemove(dependencies: RunDependencies): RunResult {
	const worktreePath = parseWorktreePath(dependencies.stdin);
	if (worktreePath === undefined) {
		console.error("worktree-remove: missing `worktree_path` in stdin payload");
		return { code: 1 };
	}

	const binary = worktrunkBinary(dependencies.platform);
	return removeWorktree(dependencies.spawn, binary, worktreePath) ? { code: 0 } : { code: 1 };
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(object: JsonObject, key: string): string | undefined {
	const value = object[key];
	return typeof value === "string" ? value : undefined;
}

function tryParseJson(raw: string): JsonValue | undefined {
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

function readJsonStringField(raw: string, key: string): string | undefined {
	const parsed = tryParseJson(raw);
	if (!isJsonObject(parsed)) {
		return undefined;
	}

	const value = readString(parsed, key);
	return value !== undefined && value !== "" ? value : undefined;
}

/* v8 ignore start -- entry-point glue runs only when executed directly. */
// Reads stdin, calls runWorktreeRemove, and forwards the exit code. Exercised
// via the WorktreeRemove hook in `.claude/settings.json`; the unit tests cover
// runWorktreeRemove directly with injected dependencies.

async function readStdin(): Promise<string> {
	let data = "";
	process.stdin.setEncoding("utf8");
	for await (const chunk of process.stdin) {
		data += chunk;
	}

	return data;
}

function spawnWt(command: string, args: ReadonlyArray<string>): SpawnResult {
	const result = spawnSync(command, [...args], {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "inherit"],
		windowsHide: true,
	});
	return {
		error: result.error,
		status: result.status,
		stdout: result.stdout,
	};
}

async function main(): Promise<void> {
	const result = runWorktreeRemove({
		platform: process.platform,
		spawn: spawnWt,
		stdin: await readStdin(),
	});
	process.exit(result.code);
}

if (import.meta.main) {
	main().catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	});
}
/* v8 ignore stop */
