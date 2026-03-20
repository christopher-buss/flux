import { defineConfig } from "@isentinel/jest-roblox";

import process from "node:process";

const IS_IN_AGENT_SESSION =
	"CLAUDECODE" in process.env ||
	"CODEX_THREAD_ID" in process.env ||
	"CURSOR_AGENT" in process.env;

export default defineConfig({
	backend: "open-cloud",
	clearMocks: true,
	collectCoverage: true,
	compact: IS_IN_AGENT_SESSION,
	coverageThreshold: {
		branches: 100,
		functions: 100,
		lines: 100,
		statements: 100,
	},
	gameOutput: "game-output.log",
	outputFile: "jest-output.log",
	placeFile: "test.rbxl",
	projects: ["ReplicatedStorage/packages/core"],
	setupFiles: ["TestService/setup"],
	setupFilesAfterEnv: ["ReplicatedStorage/test-utils/src/jest-extended"],
	typecheck: true,
});
