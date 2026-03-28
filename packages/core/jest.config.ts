import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	coveragePathIgnorePatterns: ["**/test/", "ReplicatedStorage/flux/errors/error"],
	extends: "../../jest.shared.ts",
	projects: [
		{
			test: {
				displayName: { name: "core", color: "magenta" },
				include: ["src/**/*.spec.ts"],
				mockDataModel: true,
				outDir: "out-test/src",
			},
		},
		{
			test: {
				displayName: { name: "core:integration", color: "white" },
				include: ["test/**/*.spec.ts"],
				mockDataModel: true,
				outDir: "out-test/test",
			},
		},
	],
});
