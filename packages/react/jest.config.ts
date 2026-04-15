import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	extends: "../../jest.shared.ts",
	projects: [
		{
			test: {
				displayName: { name: "react", color: "blue" },
				include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
				mockDataModel: true,
				outDir: "out-test",
			},
		},
	],
	setupFiles: ["@flux/test-utils/out/setup", "@flux/test-utils/loaders/react-setup"],
});
