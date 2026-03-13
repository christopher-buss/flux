import type { Config } from "@isentinel/jest-roblox";

import process from "node:process";

const IS_IN_AGENT_SESSION =
	"CLAUDECODE" in process.env ||
	"CODEX_THREAD_ID" in process.env ||
	"CURSOR_AGENT" in process.env;

const config: Config = {
	backend: "open-cloud",
	clearMocks: true,
	compact: IS_IN_AGENT_SESSION,
	gameOutput: "game-output.log",
	outputFile: "jest-output.log",
	projects: ["ReplicatedStorage/client", "ServerScriptService/server"],
	setupFiles: ["TestService/setup"],
	setupFilesAfterEnv: ["ReplicatedStorage/shared/test/setup/jest-extended"],
	verbose: true,
} satisfies Config;

export default config;
