import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	backend: "open-cloud",
	gameOutput: "game-output.log",
	jestPath: "ReplicatedStorage/rbxts_include/node_modules/@rbxts/jest/src",
	outputFile: "jest-output.log",
	placeFile: "test.rbxl",
	rojoProject: "test.project.json",
	test: {
		clearMocks: true,
		collectCoverage: true,
		coveragePathIgnorePatterns: ["**/test/", "**/index.ts"],
		coverageThreshold: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
		setupFiles: ["@flux/test-utils/out/setup"],
		setupFilesAfterEnv: ["@flux/test-utils/loaders/jest-extended"],
		testTimeout: 5000,
	},
	timeout: 30000,
	typecheck: true,
});
