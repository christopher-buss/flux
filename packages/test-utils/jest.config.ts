import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	extends: "../../jest.shared.ts",
	test: {
		collectCoverage: false,
		passWithNoTests: true,
		projects: [
			{
				test: {
					displayName: { name: "test-utils", color: "purple" },
					include: ["src/*.spec.ts"],
					outDir: "out-test/src",
				},
			},
		],
		setupFiles: () => ["./out/setup.luau"],
		setupFilesAfterEnv: () => ["./out/jest-extended.luau"],
		testPathIgnorePatterns: ["/node_modules/", "/dist/"],
	},
});
