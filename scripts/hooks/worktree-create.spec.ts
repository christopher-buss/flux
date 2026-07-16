/* eslint-disable test/require-hook -- These node-side specs run on vitest, not
   jest-roblox; eslint-plugin-jest does not recognize `describe` imported from
   vitest, so it reads each block as a bare top-level call. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import type { JsonObject, JsonValue } from "type-fest";
import { describe, expect, it, vi } from "vitest";

import {
	buildWtArgs,
	captureStdout,
	createWorktree,
	extractPath,
	fetchRemoteBase,
	parseName,
	resolveClaudeConfigPath,
	resolveProjectDirectory,
	resolveRemoteBase,
	runWorktreeCreate,
	type SpawnFunc,
	type SpawnResult,
	type TrustDependencies,
	trustWorktreePath,
	worktrunkBinary,
} from "./worktree-create.ts";

function fakeSpawn(result: { error?: Error; status: null | number; stdout?: string }): SpawnFunc {
	return () => result;
}

function captureConsoleError(run: () => void): string {
	const spy = vi.spyOn(console, "error").mockImplementation(() => {});
	try {
		run();
		return spy.mock.calls
			.map((args) => args.map((value) => String(value)).join(" "))
			.join("\n");
	} finally {
		spy.mockRestore();
	}
}

describe("buildWtArgs", () => {
	it("should omit --no-hooks so wt switch runs pre-start/post-start during create", () => {
		expect.assertions(1);

		expect(buildWtArgs("feature-x", "origin/main")).not.toContain("--no-hooks");
	});

	it("should pass --yes so a non-interactive hook never waits on approval", () => {
		expect.assertions(1);

		expect(buildWtArgs("feature-x", "origin/main")).toContain("--yes");
	});

	it("should base the new branch on the given ref", () => {
		expect.assertions(2);

		const args = buildWtArgs("feature-x", "origin/main");

		expect(args).toContain("--base");
		expect(args[args.indexOf("--base") + 1]).toBe("origin/main");
	});
});

describe("worktrunkBinary", () => {
	it("should use git-wt.exe on Windows to dodge the Windows Terminal `wt` shadow", () => {
		expect.assertions(1);

		expect(worktrunkBinary("win32")).toBe("git-wt.exe");
	});

	it("should use wt on non-Windows platforms", () => {
		expect.assertions(1);

		expect(worktrunkBinary("darwin")).toBe("wt");
	});
});

describe("resolveRemoteBase", () => {
	it("should return origin/HEAD when it resolves to a remote ref", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ status: 0, stdout: "origin/next\n" });

		expect(resolveRemoteBase(spawn)).toBe("origin/next");
	});

	it("should fall back to origin/main when origin/HEAD is not a remote ref", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ status: 128, stdout: "HEAD\n" });

		expect(resolveRemoteBase(spawn)).toBe("origin/main");
	});

	it("should fall back to origin/main when stdout is undefined", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ status: 128 });

		expect(resolveRemoteBase(spawn)).toBe("origin/main");
	});
});

describe("fetchRemoteBase", () => {
	it("should fetch the branch name without the origin/ prefix", () => {
		expect.assertions(2);

		let capturedArgs: ReadonlyArray<string> = [];
		function spawn(_command: string, args: ReadonlyArray<string>): SpawnResult {
			capturedArgs = args;
			return { status: 0 };
		}

		fetchRemoteBase(spawn, "origin/main");

		expect(capturedArgs).toContain("main");
		expect(capturedArgs).not.toContain("origin/main");
	});
});

describe("extractPath", () => {
	it("should return the path field from wt's JSON output", () => {
		expect.assertions(1);

		expect(extractPath('{"path":"/repo/.worktrees/foo"}')).toBe("/repo/.worktrees/foo");
	});

	it("should find the path when hook progress precedes the JSON line", () => {
		expect.assertions(1);

		expect(extractPath('info: running pre-start\n{"path":"/repo/foo"}')).toBe("/repo/foo");
	});

	it("should return undefined when stdout is not JSON", () => {
		expect.assertions(1);

		expect(extractPath("not json")).toBeUndefined();
	});

	it("should return undefined when JSON has no path field", () => {
		expect.assertions(1);

		expect(extractPath('{"branch":"foo"}')).toBeUndefined();
	});

	it("should return undefined when path is an empty string", () => {
		expect.assertions(1);

		expect(extractPath('{"path":""}')).toBeUndefined();
	});

	it("should return undefined when the JSON top-level is an array", () => {
		expect.assertions(1);

		expect(extractPath('[{"path":"/foo"}]')).toBeUndefined();
	});
});

describe("parseName", () => {
	it("should extract the branch name from the stdin payload", () => {
		expect.assertions(1);

		expect(parseName('{"name":"feature-x"}')).toBe("feature-x");
	});

	it("should return undefined for non-JSON payloads", () => {
		expect.assertions(1);

		expect(parseName("")).toBeUndefined();
	});

	it("should return undefined when the name field is empty", () => {
		expect.assertions(1);

		expect(parseName('{"name":""}')).toBeUndefined();
	});
});

describe("resolveProjectDirectory", () => {
	it("should read CLAUDE_PROJECT_DIR from the environment", () => {
		expect.assertions(1);

		expect(resolveProjectDirectory({ CLAUDE_PROJECT_DIR: "/repo" }, "/cwd")).toBe("/repo");
	});

	it("should fall back to cwd when the env var is missing", () => {
		expect.assertions(1);

		expect(resolveProjectDirectory({}, "/cwd")).toBe("/cwd");
	});

	it("should fall back to cwd when the env var is empty", () => {
		expect.assertions(1);

		expect(resolveProjectDirectory({ CLAUDE_PROJECT_DIR: "" }, "/cwd")).toBe("/cwd");
	});
});

describe("captureStdout", () => {
	it("should return promptly when the command backgrounds a child that inherits stdout", () => {
		expect.assertions(2);

		const directory = mkdtempSync(join(tmpdir(), "wt-create-spec-"));
		const fakeWt = join(directory, "fake-wt.mjs");
		const outFile = join(directory, "stdout");
		// Mimic worktrunk: print the JSON path, then leave a detached child that
		// inherits stdout alive. A pipe capture blocks on EOF until this child
		// exits; a file capture returns when the parent exits.
		writeFileSync(
			fakeWt,
			[
				'import { spawn } from "node:child_process";',
				'process.stdout.write(JSON.stringify({ path: "/repo/wt/foo" }) + "\\n");',
				'const child = spawn(process.execPath, ["-e", "setTimeout(() => undefined, 12000)"], {',
				"	detached: true,",
				'	stdio: ["ignore", "inherit", "ignore"],',
				"});",
				"child.unref();",
			].join("\n"),
		);

		try {
			const startedAt = Date.now();
			const result = captureStdout(process.execPath, [fakeWt], directory, outFile);
			const elapsedMs = Date.now() - startedAt;

			expect(result.stdout).toContain("/repo/wt/foo");
			expect(elapsedMs).toBeLessThan(8000);
		} finally {
			try {
				rmSync(directory, { force: true, recursive: true });
			} catch {
				// The detached child may still hold the temp file open on
				// Windows.
			}
		}
	}, 10000);

	it("should surface a spawn error and empty stdout for a missing command", () => {
		expect.assertions(2);

		const directory = mkdtempSync(join(tmpdir(), "wt-create-spec-"));
		const outFile = join(directory, "stdout");

		try {
			const result = captureStdout(
				"definitely-not-a-real-binary-xyz",
				[],
				directory,
				outFile,
			);

			expect(result.error).toBeDefined();
			expect(result.stdout).toBe("");
		} finally {
			rmSync(directory, { force: true, recursive: true });
		}
	});
});

describe("createWorktree", () => {
	it("should return the worktree path on success", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ status: 0, stdout: '{"path":"/repo/.worktrees/foo"}' });

		expect(createWorktree(spawn, "wt", "foo")).toBe("/repo/.worktrees/foo");
	});

	it("should return undefined when wt fails to spawn", () => {
		expect.assertions(2);

		const spawn = fakeSpawn({ error: new Error("ENOENT"), status: null, stdout: "" });

		expect(
			captureConsoleError(() => {
				expect(createWorktree(spawn, "wt", "foo")).toBeUndefined();
			}),
		).toMatch(/is worktrunk installed/);
	});

	it("should return undefined on a non-zero exit", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ status: 1, stdout: "" });

		captureConsoleError(() => {
			expect(createWorktree(spawn, "wt", "foo")).toBeUndefined();
		});
	});

	it("should treat undefined stdout (real spawnSync on ENOENT) as empty", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ error: new Error("ENOENT"), status: null });

		captureConsoleError(() => {
			expect(createWorktree(spawn, "wt", "foo")).toBeUndefined();
		});
	});

	it("should return undefined when wt succeeds but stdout has no parseable path", () => {
		expect.assertions(1);

		const spawn = fakeSpawn({ status: 0 });

		captureConsoleError(() => {
			expect(createWorktree(spawn, "wt", "foo")).toBeUndefined();
		});
	});

	it("should log a truncated stdout preview when the path is missing", () => {
		expect.assertions(2);

		const garbage = "warning: deprecated\n".repeat(50);
		const spawn = fakeSpawn({ status: 0, stdout: garbage });

		const stderr = captureConsoleError(() => {
			createWorktree(spawn, "wt", "foo");
		});

		expect(stderr).toMatch(/no path in JSON output/);
		expect(stderr).toMatch(/warning: deprecated/);
	});

	it("should base the worktree on the fetched remote default", () => {
		expect.assertions(2);

		let switchArgs: ReadonlyArray<string> = [];
		function spawn(command: string, args: ReadonlyArray<string>): SpawnResult {
			if (command === "git" && args[0] === "rev-parse") {
				return { status: 0, stdout: "origin/main\n" };
			}

			if (command === "git") {
				return { status: 0 };
			}

			switchArgs = args;
			return { status: 0, stdout: '{"path":"/repo/foo"}' };
		}

		expect(createWorktree(spawn, "wt", "foo")).toBe("/repo/foo");
		expect(switchArgs).toContain("origin/main");
	});
});

describe("resolveClaudeConfigPath", () => {
	it("should join CLAUDE_CONFIG_DIR with .claude.json when set", () => {
		expect.assertions(1);

		expect(resolveClaudeConfigPath({ CLAUDE_CONFIG_DIR: "/cfg" }, "/home")).toBe(
			join("/cfg", ".claude.json"),
		);
	});

	it("should fall back to the home directory when the env var is unset", () => {
		expect.assertions(1);

		expect(resolveClaudeConfigPath({}, "/home")).toBe(join("/home", ".claude.json"));
	});

	it("should fall back to the home directory when the env var is empty", () => {
		expect.assertions(1);

		expect(resolveClaudeConfigPath({ CLAUDE_CONFIG_DIR: "" }, "/home")).toBe(
			join("/home", ".claude.json"),
		);
	});
});

function fakeTrustDependencies(options: {
	config?: string;
	realpathResult?: string;
}): TrustDependencies & { writes: Array<{ contents: string; path: string }> } {
	const writes: Array<{ contents: string; path: string }> = [];
	return {
		configPath: "/home/.claude.json",
		readFile: () => options.config,
		realpath: () => options.realpathResult,
		writeFile: (path, contents) => void writes.push({ contents, path }),
		writes,
	};
}

/**
 * Narrow a JSON value to an object.
 *
 * A declared predicate rather than an inline check: JsonValue's array arm
 * includes `readonly JsonValue[]`, which Array.isArray cannot narrow away on
 * its own.
 * @param value - The value to test.
 * @returns Whether the value is a JSON object.
 */
function isJsonObject(value: JsonValue | undefined): value is JsonObject {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asJsonObject(value: JsonValue | undefined): JsonObject {
	if (!isJsonObject(value)) {
		throw new Error("expected a JSON object");
	}

	return value;
}

function writtenConfig(dependencies: { writes: Array<{ contents: string }> }): JsonObject {
	return asJsonObject(JSON.parse(dependencies.writes[0]!.contents) as JsonValue);
}

function writtenProjects(dependencies: { writes: Array<{ contents: string }> }): JsonObject {
	return asJsonObject(writtenConfig(dependencies)["projects"]);
}

describe("trustWorktreePath", () => {
	it("should create the config with a trusted entry when the file is missing", () => {
		expect.assertions(3);

		const dependencies = fakeTrustDependencies({});

		expect(trustWorktreePath("/wt/foo", dependencies)).toBe(true);
		expect(dependencies.writes[0]!.path).toBe("/home/.claude.json");
		expect(writtenProjects(dependencies)["/wt/foo"]).toStrictEqual({
			hasTrustDialogAccepted: true,
		});
	});

	it("should write under both the realpath key and the literal key when they differ", () => {
		expect.assertions(2);

		const dependencies = fakeTrustDependencies({
			config: "{}",
			realpathResult: "/real/wt/foo",
		});

		trustWorktreePath("/wt/foo", dependencies);

		const projects = writtenProjects(dependencies);

		expect(projects["/real/wt/foo"]).toStrictEqual({ hasTrustDialogAccepted: true });
		expect(projects["/wt/foo"]).toStrictEqual({ hasTrustDialogAccepted: true });
	});

	it("should preserve existing entry fields and unrelated projects", () => {
		expect.assertions(3);

		const dependencies = fakeTrustDependencies({
			config: JSON.stringify({
				otherTopLevel: 1,
				projects: {
					"/other": { hasTrustDialogAccepted: false },
					"/wt/foo": { allowedTools: ["Bash"] },
				},
			}),
		});

		trustWorktreePath("/wt/foo", dependencies);

		const written = writtenConfig(dependencies);
		const projects = writtenProjects(dependencies);

		expect(projects["/wt/foo"]).toStrictEqual({
			allowedTools: ["Bash"],
			hasTrustDialogAccepted: true,
		});
		expect(projects["/other"]).toStrictEqual({ hasTrustDialogAccepted: false });
		expect(written["otherTopLevel"]).toBe(1);
	});

	it("should not write and return false when the config is malformed", () => {
		expect.assertions(3);

		const dependencies = fakeTrustDependencies({ config: "not json{" });

		const stderr = captureConsoleError(() => {
			expect(trustWorktreePath("/wt/foo", dependencies)).toBe(false);
		});

		expect(dependencies.writes).toHaveLength(0);
		expect(stderr).toMatch(/not valid JSON/);
	});

	it("should not write and return false when the config is valid JSON but not an object", () => {
		expect.assertions(3);

		const dependencies = fakeTrustDependencies({ config: "[1, 2]" });

		const stderr = captureConsoleError(() => {
			expect(trustWorktreePath("/wt/foo", dependencies)).toBe(false);
		});

		expect(dependencies.writes).toHaveLength(0);
		expect(stderr).toMatch(/not a JSON object/);
	});

	it("should write a single key when realpath matches the literal path", () => {
		expect.assertions(2);

		const dependencies = fakeTrustDependencies({ config: "{}", realpathResult: "/wt/foo" });

		trustWorktreePath("/wt/foo", dependencies);

		expect(Object.keys(writtenProjects(dependencies))).toStrictEqual(["/wt/foo"]);
		expect(dependencies.writes).toHaveLength(1);
	});

	it("should not write when the path is already trusted", () => {
		expect.assertions(2);

		const dependencies = fakeTrustDependencies({
			config: JSON.stringify({
				projects: { "/wt/foo": { hasTrustDialogAccepted: true } },
			}),
		});

		expect(trustWorktreePath("/wt/foo", dependencies)).toBe(true);
		expect(dependencies.writes).toHaveLength(0);
	});

	it("should replace a non-object projects value", () => {
		expect.assertions(1);

		const dependencies = fakeTrustDependencies({ config: '{"projects":"bogus"}' });

		trustWorktreePath("/wt/foo", dependencies);

		expect(writtenProjects(dependencies)["/wt/foo"]).toStrictEqual({
			hasTrustDialogAccepted: true,
		});
	});

	it("should replace a non-object project entry", () => {
		expect.assertions(1);

		const dependencies = fakeTrustDependencies({
			config: JSON.stringify({ projects: { "/wt/foo": "bogus" } }),
		});

		trustWorktreePath("/wt/foo", dependencies);

		expect(writtenProjects(dependencies)["/wt/foo"]).toStrictEqual({
			hasTrustDialogAccepted: true,
		});
	});
});

describe("runWorktreeCreate", () => {
	it("should write the path with a trailing newline on success", () => {
		expect.assertions(1);

		const result = runWorktreeCreate({
			cwd: "/cwd",
			env: { CLAUDE_PROJECT_DIR: "/repo" },
			platform: "linux",
			spawn: () => fakeSpawn({ status: 0, stdout: '{"path":"/repo/.worktrees/foo"}' }),
			stdin: '{"name":"foo"}',
			trust: () => {},
		});

		expect(result).toStrictEqual({ code: 0, stdout: "/repo/.worktrees/foo\n" });
	});

	it("should pre-trust the created worktree path", () => {
		expect.assertions(1);

		let trustedPath = "";
		runWorktreeCreate({
			cwd: "/cwd",
			env: { CLAUDE_PROJECT_DIR: "/repo" },
			platform: "linux",
			spawn: () => fakeSpawn({ status: 0, stdout: '{"path":"/repo/.worktrees/foo"}' }),
			stdin: '{"name":"foo"}',
			trust: (path) => {
				trustedPath = path;
			},
		});

		expect(trustedPath).toBe("/repo/.worktrees/foo");
	});

	it("should still succeed when pre-trusting throws", () => {
		expect.assertions(2);

		let result;
		const stderr = captureConsoleError(() => {
			result = runWorktreeCreate({
				cwd: "/cwd",
				env: { CLAUDE_PROJECT_DIR: "/repo" },
				platform: "linux",
				spawn: () => fakeSpawn({ status: 0, stdout: '{"path":"/repo/foo"}' }),
				stdin: '{"name":"foo"}',
				trust: () => {
					throw new Error("disk full");
				},
			});
		});

		expect(result).toStrictEqual({ code: 0, stdout: "/repo/foo\n" });
		expect(stderr).toMatch(/disk full/);
	});

	it("should fail when stdin has no name", () => {
		expect.assertions(1);

		const result = captureConsoleError(() => {
			runWorktreeCreate({
				cwd: "/cwd",
				env: { CLAUDE_PROJECT_DIR: "/repo" },
				platform: "linux",
				spawn: () => fakeSpawn({ status: 0, stdout: '{"path":"/foo"}' }),
				stdin: "{}",
				trust: () => {},
			});
		});

		expect(result).toMatch(/missing `name`/);
	});

	it("should fall back to cwd when CLAUDE_PROJECT_DIR is unset", () => {
		expect.assertions(2);

		let capturedDirectory = "";
		const result = runWorktreeCreate({
			cwd: "/fallback",
			env: {},
			platform: "linux",
			spawn: (projectDirectory) => {
				capturedDirectory = projectDirectory;
				return fakeSpawn({ status: 0, stdout: '{"path":"/fallback/foo"}' });
			},
			stdin: '{"name":"foo"}',
			trust: () => {},
		});

		expect(capturedDirectory).toBe("/fallback");
		expect(result.code).toBe(0);
	});

	it("should pass the resolved project directory to spawn", () => {
		expect.assertions(1);

		let capturedDirectory = "";
		runWorktreeCreate({
			cwd: "/cwd",
			env: { CLAUDE_PROJECT_DIR: "/captured" },
			platform: "linux",
			spawn: (projectDirectory) => {
				capturedDirectory = projectDirectory;
				return fakeSpawn({ status: 0, stdout: '{"path":"/captured/foo"}' });
			},
			stdin: '{"name":"foo"}',
			trust: () => {},
		});

		expect(capturedDirectory).toBe("/captured");
	});

	it("should call git-wt.exe on Windows", () => {
		expect.assertions(1);

		let capturedCommand = "";
		runWorktreeCreate({
			cwd: "/cwd",
			env: { CLAUDE_PROJECT_DIR: "/repo" },
			platform: "win32",
			spawn: () => {
				return (command) => {
					// Record only the worktrunk call; git rev-parse/fetch also
					// run, so last-call-wins would be fragile to reordering.
					if (command !== "git") {
						capturedCommand = command;
					}

					return { status: 0, stdout: '{"path":"/repo/foo"}' };
				};
			},
			stdin: '{"name":"foo"}',
			trust: () => {},
		});

		expect(capturedCommand).toBe("git-wt.exe");
	});

	it("should fail when wt returns no path", () => {
		expect.assertions(1);

		const result = captureConsoleError(() => {
			runWorktreeCreate({
				cwd: "/cwd",
				env: { CLAUDE_PROJECT_DIR: "/repo" },
				platform: "linux",
				spawn: () => fakeSpawn({ status: 0, stdout: "garbage" }),
				stdin: '{"name":"foo"}',
				trust: () => {},
			});
		});

		expect(result).toMatch(/no path in JSON output/);
	});
});
