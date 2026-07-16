import { spawnSync } from "node:child_process";
import {
	closeSync,
	mkdtempSync,
	openSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
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

const REMOTE_PREFIX = "origin/";
const DEFAULT_REMOTE_BASE = `${REMOTE_PREFIX}main`;

/**
 * Build the worktrunk arguments that create a worktree for a new branch.
 * @param name - Branch name Claude Code asked for.
 * @param base - Remote-tracking ref to cut the branch from.
 * @returns Arguments for `wt`.
 */
export function buildWtArgs(name: string, base: string): ReadonlyArray<string> {
	// No --no-hooks: wt runs pre-start (blocking) and post-start (background)
	// during create, so a fresh worktree is set up in one step. --base cuts the
	// branch from the fetched remote default, never a stale local checkout.
	return ["switch", "--create", name, "--base", base, "--no-cd", "--yes", "--format", "json"];
}

/**
 * Resolve the remote default-branch ref new worktrees should branch from.
 *
 * Reads `origin/HEAD`; falls back to `origin/main` when it is unset.
 * @param spawn - Spawn function bound to the project directory.
 * @returns A remote-tracking ref such as `origin/main`.
 */
export function resolveRemoteBase(spawn: SpawnFunc): string {
	const result = spawn("git", ["rev-parse", "--abbrev-ref", "origin/HEAD"]);
	const ref = (result.stdout ?? "").trim();
	return ref.startsWith(REMOTE_PREFIX) ? ref : DEFAULT_REMOTE_BASE;
}

/**
 * Fetch the remote default branch so the worktree branches from its latest tip.
 *
 * Best-effort: a failed fetch (e.g. Offline) leaves the last-fetched ref in
 * place, which still exists locally, so creation continues.
 * @param spawn - Spawn function bound to the project directory.
 * @param base - Remote-tracking ref from {@link resolveRemoteBase}.
 */
export function fetchRemoteBase(spawn: SpawnFunc, base: string): void {
	spawn("git", ["fetch", "origin", base.slice(REMOTE_PREFIX.length), "--quiet"]);
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
 * Pull the created worktree's path out of worktrunk's JSON output.
 * @param stdout - Everything worktrunk printed.
 * @returns The path, or `undefined` when no JSON line carried one.
 */
export function extractPath(stdout: string): string | undefined {
	// Hooks run during create now, so stdout interleaves progress with the JSON
	// result; scan line by line for the first object carrying a path.
	for (const line of stdout.split("\n")) {
		const path = readJsonStringField(line, "path");
		if (path !== undefined) {
			return path;
		}
	}

	return undefined;
}

/**
 * Read the requested branch name out of the hook's stdin payload.
 * @param raw - Raw stdin contents.
 * @returns The name, or `undefined` when the payload is missing or malformed.
 */
export function parseName(raw: string): string | undefined {
	return readJsonStringField(raw, "name");
}

/**
 * Resolve the project root for the worktree operation.
 *
 * The desktop "create in worktree" flow runs this hook command without
 * substituting `${CLAUDE_PROJECT_DIR}`, so the env var can be absent. Fall
 * back to the hook's working directory (the project root) so worktree
 * creation still resolves the right repo.
 * @param environment - Process environment to read `CLAUDE_PROJECT_DIR` from.
 * @param cwd - Working directory to fall back to when the env var is unset.
 * @returns The resolved project root directory.
 */
export function resolveProjectDirectory(environment: NodeJS.ProcessEnv, cwd: string): string {
	const directory = environment["CLAUDE_PROJECT_DIR"];
	return directory !== undefined && directory !== "" ? directory : cwd;
}

const STDOUT_PREVIEW_LIMIT = 200;

/** Config-file access injected into {@link trustWorktreePath}. */
export interface TrustDependencies {
	/** Absolute path of the `.claude.json` holding per-project trust flags. */
	readonly configPath: string;
	/** Reads the config, returning `undefined` when the file is absent. */
	readonly readFile: (path: string) => string | undefined;
	/** Resolves a path's real casing, returning `undefined` when unresolvable. */
	readonly realpath: (path: string) => string | undefined;
	/** Writes the config back. */
	readonly writeFile: (path: string, contents: string) => void;
}

/** Injected collaborators for {@link runWorktreeCreate}. */
export interface RunDependencies {
	/** Working directory to fall back to when `CLAUDE_PROJECT_DIR` is unset. */
	readonly cwd: string;
	/** Process environment. */
	readonly env: NodeJS.ProcessEnv;
	/** Node platform identifier, used to pick the worktrunk binary. */
	readonly platform: NodeJS.Platform;
	/** Builds a spawn function bound to the resolved project directory. */
	readonly spawn: (projectDirectory: string) => SpawnFunc;
	/** Raw JSON payload Claude Code writes to the hook's stdin. */
	readonly stdin: string;
	/** Pre-trusts the created worktree; may throw, and failure is tolerated. */
	readonly trust: (worktreePath: string) => void;
}

/** What the hook process should print and exit with. */
export interface RunResult {
	/** Process exit code: 0 on success, 1 on any failure. */
	readonly code: 0 | 1;
	/** The worktree path Claude Code reads back, newline-terminated. */
	readonly stdout?: string;
}

/**
 * Resolve the `~/.claude.json` config file holding per-project trust flags.
 * @param environment - Process environment to read `CLAUDE_CONFIG_DIR` from.
 * @param homeDirectory - Home directory to fall back to.
 * @returns The absolute config file path.
 */
export function resolveClaudeConfigPath(
	environment: NodeJS.ProcessEnv,
	homeDirectory: string,
): string {
	const directory = environment["CLAUDE_CONFIG_DIR"];
	return join(
		directory !== undefined && directory !== "" ? directory : homeDirectory,
		".claude.json",
	);
}

/**
 * Mark the worktree as trusted in `~/.claude.json`.
 *
 * Claude Desktop does not auto-trust worktrees created by a WorktreeCreate
 * hook from a committable settings tier (this repo's `.claude/settings.json`),
 * and its `getGitInfo`/`getGitDiff` return null for untrusted paths, so the
 * desktop diff view silently falls back to the main checkout. Mirror the
 * desktop's own auto-trust write: set
 * `projects[<path>].hasTrustDialogAccepted` under both the realpath and the
 * literal worktree path.
 * @param worktreePath - Absolute worktree path as printed to Claude.
 * @param dependencies - Config file access.
 * @returns Whether the path is (now) trusted.
 */
export function trustWorktreePath(worktreePath: string, dependencies: TrustDependencies): boolean {
	const config = readClaudeConfig(dependencies);
	if (config === undefined) {
		return false;
	}

	const existingProjects = config["projects"];
	const projects: JsonObject = isJsonObject(existingProjects) ? existingProjects : {};
	const keys = new Set([dependencies.realpath(worktreePath) ?? worktreePath, worktreePath]);
	let hasChanged = false;
	for (const key of keys) {
		const entry = projects[key];
		const fields = isJsonObject(entry) ? entry : {};
		if (fields["hasTrustDialogAccepted"] === true) {
			continue;
		}

		projects[key] = { ...fields, hasTrustDialogAccepted: true };
		hasChanged = true;
	}

	if (hasChanged) {
		config["projects"] = projects;
		dependencies.writeFile(dependencies.configPath, JSON.stringify(config, undefined, 2));
	}

	return true;
}

/**
 * Run a command and capture its stdout via a temp file rather than a pipe.
 *
 * `wt switch --create` backgrounds the post-start build, which inherits the
 * stdout handle. With a pipe, `spawnSync` blocks on EOF until that build exits
 * (or the hook times out): the worktree is created but its path is never
 * returned, so Claude Desktop hangs on "starting session". A file handle has no
 * EOF wait, so `spawnSync` returns as soon as `wt` itself exits.
 * @param command - Executable to run.
 * @param args - Arguments for the command.
 * @param cwd - Working directory for the command.
 * @param outFile - Path the command's stdout is redirected to.
 * @returns The spawn result with stdout read back from the file.
 */
export function captureStdout(
	command: string,
	args: ReadonlyArray<string>,
	cwd: string,
	outFile: string,
): SpawnResult {
	const handle = openSync(outFile, "w");
	let result: ReturnType<typeof spawnSync>;
	try {
		result = spawnSync(command, [...args], {
			cwd,
			stdio: ["ignore", handle, "inherit"],
			windowsHide: true,
		});
	} finally {
		closeSync(handle);
	}

	// Read after closing the write handle. spawnSync has already waited for the
	// child to exit, so every write is flushed and the file is complete.
	return {
		error: result.error,
		status: result.status,
		stdout: readFileSync(outFile, "utf8"),
	};
}

/**
 * Create a worktree for a new branch cut from the fetched remote default.
 * @param spawn - Spawn function bound to the project directory.
 * @param binary - Worktrunk executable from {@link worktrunkBinary}.
 * @param name - Branch name Claude Code asked for.
 * @returns The created worktree's path, or `undefined` on any failure.
 */
export function createWorktree(spawn: SpawnFunc, binary: string, name: string): string | undefined {
	const base = resolveRemoteBase(spawn);
	fetchRemoteBase(spawn, base);

	const result = spawn(binary, buildWtArgs(name, base));
	if (result.error !== undefined) {
		console.error(
			`worktree-create: failed to spawn ${binary} (${result.error.message}); is worktrunk installed?`,
		);
		return undefined;
	}

	if (result.status !== 0) {
		console.error(
			`worktree-create: ${binary} switch --create ${name} failed (exit ${result.status})`,
		);
		return undefined;
	}

	const stdout = result.stdout ?? "";
	const path = extractPath(stdout);
	if (path === undefined) {
		const preview = stdout.slice(0, STDOUT_PREVIEW_LIMIT);
		console.error(
			`worktree-create: wt returned no path in JSON output. stdout preview: ${JSON.stringify(preview)}`,
		);
		return undefined;
	}

	return path;
}

/**
 * Run the WorktreeCreate hook: parse stdin, create the worktree, pre-trust it,
 * and report its path back to Claude Code.
 * @param dependencies - Injected environment, spawn, stdin, and trust writer.
 * @returns The exit code and the path to print.
 */
export function runWorktreeCreate(dependencies: RunDependencies): RunResult {
	const name = parseName(dependencies.stdin);
	if (name === undefined) {
		console.error("worktree-create: missing `name` in stdin payload");
		return { code: 1 };
	}

	const projectDirectory = resolveProjectDirectory(dependencies.env, dependencies.cwd);
	const binary = worktrunkBinary(dependencies.platform);
	const path = createWorktree(dependencies.spawn(projectDirectory), binary, name);
	if (path === undefined) {
		return { code: 1 };
	}

	// Best-effort: a failed pre-trust degrades the desktop diff view but must
	// not fail worktree creation.
	try {
		dependencies.trust(path);
	} catch (err) {
		console.error(`worktree-create: failed to pre-trust ${path}: ${String(err)}`);
	}

	return { code: 0, stdout: `${path}\n` };
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryParseJson(raw: string): JsonValue | undefined {
	try {
		return JSON.parse(raw) as JsonValue;
	} catch {
		return undefined;
	}
}

/**
 * Read the trust config, treating a missing file as an empty one.
 *
 * Read-modify-write with no lock: another Claude process can rewrite the config
 * between this read and our rename, and the last writer wins. Accepted
 * trade-off - the flag self-heals on the next worktree creation.
 * @param dependencies - Config file access.
 * @returns The parsed config, or `undefined` when it is unusable.
 */
function readClaudeConfig(dependencies: TrustDependencies): JsonObject | undefined {
	const raw = dependencies.readFile(dependencies.configPath);
	if (raw === undefined) {
		return {};
	}

	const parsed = tryParseJson(raw);
	if (parsed === undefined) {
		console.error(
			`worktree-create: ${dependencies.configPath} is not valid JSON; skipping pre-trust`,
		);
		return undefined;
	}

	if (!isJsonObject(parsed)) {
		console.error(
			`worktree-create: ${dependencies.configPath} is not a JSON object; skipping pre-trust`,
		);
		return undefined;
	}

	return parsed;
}

function readString(object: JsonObject, key: string): string | undefined {
	const value = object[key];
	return typeof value === "string" ? value : undefined;
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
// Reads stdin, calls runWorktreeCreate, and forwards the result to
// stdout/exit. Exercised via the WorktreeCreate hook in
// `.claude/settings.json`; the unit tests cover runWorktreeCreate directly
// with injected dependencies.

async function readStdin(): Promise<string> {
	let data = "";
	process.stdin.setEncoding("utf8");
	for await (const chunk of process.stdin) {
		data += chunk;
	}

	return data;
}

function spawnWt(projectDirectory: string): SpawnFunc {
	return (command, args) => {
		const directory = mkdtempSync(join(tmpdir(), "wt-create-"));
		try {
			return captureStdout(command, args, projectDirectory, join(directory, "stdout"));
		} finally {
			// Best-effort: the background post-start build inherits the temp
			// file handle and may hold it open on Windows; leave any leftover to
			// the OS temp sweeper rather than failing the hook.
			try {
				rmSync(directory, { force: true, recursive: true });
			} catch {
				// ignore
			}
		}
	};
}

function readConfigIfPresent(path: string): string | undefined {
	let contents: string | undefined;
	try {
		contents = readFileSync(path, "utf8");
	} catch (err) {
		// Missing config: trustWorktreePath creates it from scratch. Any other
		// failure (e.g. EACCES) must not masquerade as "missing" and trigger a
		// rewrite of a file we could not read.
		if (!(err instanceof Error) || !("code" in err) || err.code !== "ENOENT") {
			throw err;
		}
	}

	return contents;
}

function realpathIfResolvable(path: string): string | undefined {
	let resolved: string | undefined;
	try {
		// .native resolves the on-disk casing, matching the key the desktop app
		// itself writes when auto-trusting.
		resolved = realpathSync.native(path);
	} catch {
		// Fall back to the literal path key.
	}

	return resolved;
}

function writeConfigAtomically(path: string, contents: string): void {
	// Atomic swap: other Claude processes rewrite this file wholesale.
	const temporary = `${path}.worktree-create-${process.pid}.tmp`;
	writeFileSync(temporary, contents);
	try {
		renameSync(temporary, path);
	} catch (err) {
		// Another process may hold the config open on Windows; don't leave the
		// temp file behind.
		try {
			rmSync(temporary, { force: true });
		} catch {
			// ignore
		}

		throw err;
	}
}

function trustInClaudeConfig(worktreePath: string): void {
	trustWorktreePath(worktreePath, {
		configPath: resolveClaudeConfigPath(process.env, homedir()),
		readFile: readConfigIfPresent,
		realpath: realpathIfResolvable,
		writeFile: writeConfigAtomically,
	});
}

async function main(): Promise<void> {
	const result = runWorktreeCreate({
		cwd: process.cwd(),
		env: process.env,
		platform: process.platform,
		spawn: spawnWt,
		stdin: await readStdin(),
		trust: trustInClaudeConfig,
	});
	if (result.stdout !== undefined) {
		process.stdout.write(result.stdout);
	}

	process.exit(result.code);
}

if (import.meta.main) {
	main().catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	});
}
/* v8 ignore stop */
