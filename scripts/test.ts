import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CORE_DIR = "packages/core";
const BUILD_INFO_PATH = join(CORE_DIR, "out", "tsconfig.tsbuildinfo");
const SRC_DIR = join(CORE_DIR, "src");

function getNewestMtime(directory: string): number {
	let newest = 0;

	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const fullPath = join(directory, entry.name);

		if (entry.isDirectory()) {
			newest = Math.max(newest, getNewestMtime(fullPath));
		} else if (entry.name.endsWith(".ts")) {
			newest = Math.max(newest, statSync(fullPath).mtimeMs);
		}
	}

	return newest;
}

function needsCompile(): boolean {
	if (!existsSync(BUILD_INFO_PATH)) {
		return true;
	}

	const buildTime = statSync(BUILD_INFO_PATH).mtimeMs;
	const newestSource = getNewestMtime(SRC_DIR);

	return newestSource > buildTime;
}

function run(cmd: string, cwd?: string): void {
	execSync(cmd, { cwd, stdio: "inherit" });
}

if (needsCompile()) {
	console.log("Source newer than build, compiling...");
	run("pnpm dev:build", CORE_DIR);
}

run("jest-companion --projects ReplicatedStorage", CORE_DIR);
