import { describe, expect, it, vi } from "vitest";

import {
	buildWtArgs,
	parseWorktreePath,
	removeWorktree,
	runWorktreeRemove,
	type SpawnFunc,
	worktrunkBinary,
} from "./worktree-remove.ts";

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

describe(worktrunkBinary, () => {
	it("should use git-wt.exe on Windows to dodge the Windows Terminal `wt` shadow", () => {
		expect.assertions(1);

		expect(worktrunkBinary("win32")).toBe("git-wt.exe");
	});

	it("should use wt on non-Windows platforms", () => {
		expect.assertions(1);

		expect(worktrunkBinary("linux")).toBe("wt");
	});
});

describe(buildWtArgs, () => {
	it("should remove the worktree at the given path", () => {
		expect.assertions(2);

		const args = buildWtArgs("/repo/.worktrees/foo");

		expect(args[0]).toBe("remove");
		expect(args[1]).toBe("/repo/.worktrees/foo");
	});

	it("should pass --force so a dirty worktree is removed instead of failing", () => {
		expect.assertions(1);

		expect(buildWtArgs("/repo/.worktrees/foo")).toContain("--force");
	});

	it("should pass --foreground so removal blocks until complete", () => {
		expect.assertions(1);

		expect(buildWtArgs("/repo/.worktrees/foo")).toContain("--foreground");
	});

	it("should pass --yes so a non-interactive hook never waits on approval", () => {
		expect.assertions(1);

		expect(buildWtArgs("/repo/.worktrees/foo")).toContain("--yes");
	});
});

describe(parseWorktreePath, () => {
	it("should extract the worktree path from the stdin payload", () => {
		expect.assertions(1);

		expect(parseWorktreePath('{"worktree_path":"/repo/.worktrees/foo"}')).toBe(
			"/repo/.worktrees/foo",
		);
	});

	it("should return undefined for non-JSON payloads", () => {
		expect.assertions(1);

		expect(parseWorktreePath("not json")).toBeUndefined();
	});

	it("should return undefined when the worktree_path field is empty", () => {
		expect.assertions(1);

		expect(parseWorktreePath('{"worktree_path":""}')).toBeUndefined();
	});

	it("should return undefined when the worktree_path field is missing", () => {
		expect.assertions(1);

		expect(parseWorktreePath('{"branch":"foo"}')).toBeUndefined();
	});

	it("should return undefined when the JSON top-level is an array", () => {
		expect.assertions(1);

		expect(parseWorktreePath('[{"worktree_path":"/foo"}]')).toBeUndefined();
	});
});

describe(removeWorktree, () => {
	it("should return true when wt exits zero", () => {
		expect.assertions(1);

		expect(removeWorktree(fakeSpawn({ status: 0 }), "wt", "/repo/foo")).toBe(true);
	});

	it("should return false when wt fails to spawn", () => {
		expect.assertions(2);

		const spawn = fakeSpawn({ error: new Error("ENOENT"), status: null });

		expect(
			captureConsoleError(() => {
				expect(removeWorktree(spawn, "wt", "/repo/foo")).toBe(false);
			}),
		).toMatch(/is worktrunk installed/);
	});

	it("should return false on a non-zero exit", () => {
		expect.assertions(2);

		const spawn = fakeSpawn({ status: 1 });

		expect(
			captureConsoleError(() => {
				expect(removeWorktree(spawn, "wt", "/repo/foo")).toBe(false);
			}),
		).toMatch(/failed \(exit 1\)/);
	});
});

describe(runWorktreeRemove, () => {
	it("should return code 0 on success", () => {
		expect.assertions(1);

		const result = runWorktreeRemove({
			platform: "linux",
			spawn: () => ({ status: 0 }),
			stdin: '{"worktree_path":"/repo/foo"}',
		});

		expect(result).toStrictEqual({ code: 0 });
	});

	it("should fail when stdin has no worktree_path", () => {
		expect.assertions(1);

		const result = captureConsoleError(() => {
			runWorktreeRemove({
				platform: "linux",
				spawn: () => ({ status: 0 }),
				stdin: "{}",
			});
		});

		expect(result).toMatch(/missing `worktree_path`/);
	});

	it("should return code 1 when removal fails", () => {
		expect.assertions(1);

		let result: { code: 0 | 1 } = { code: 0 };
		captureConsoleError(() => {
			result = runWorktreeRemove({
				platform: "linux",
				spawn: () => ({ status: 1 }),
				stdin: '{"worktree_path":"/repo/foo"}',
			});
		});

		expect(result.code).toBe(1);
	});

	it("should resolve the platform binary and remove args before spawning", () => {
		expect.assertions(3);

		let capturedCommand = "";
		let capturedArgs: ReadonlyArray<string> = [];
		runWorktreeRemove({
			platform: "win32",
			spawn: (command, args) => {
				capturedCommand = command;
				capturedArgs = args;
				return { status: 0 };
			},
			stdin: '{"worktree_path":"/repo/foo"}',
		});

		expect(capturedCommand).toBe("git-wt.exe");
		expect(capturedArgs).toContain("--force");
		expect(capturedArgs[1]).toBe("/repo/foo");
	});
});
