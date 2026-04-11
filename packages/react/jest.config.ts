import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	extends: "../../jest.shared.ts",
	projects: [
		{
			test: {
				displayName: { name: "react", color: "blue" },
				include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
				mockDataModel: true,
				outDir: "out-test/src",
			},
		},
		{
			test: {
				displayName: { name: "react:integration", color: "white" },
				include: ["test/**/*.spec.ts", "test/**/*.spec.tsx"],
				mockDataModel: true,
				outDir: "out-test/test",
			},
		},
	],
	setupFiles: ["@flux/test-utils/out/setup", "@flux/test-utils/loaders/react-setup"],
});
