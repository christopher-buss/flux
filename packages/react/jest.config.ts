import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	extends: "../../jest.shared.ts",
	projects: [
		{
			test: {
				displayName: { name: "react", color: "blue" },
				include: ["src/**/*.spec.ts"],
				mockDataModel: true,
				outDir: "out-test/src",
			},
		},
	],
	setupFiles: ["@flux/test-utils/out/setup", "@flux/test-utils/loaders/react-setup"],
});
