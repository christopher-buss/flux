import { defineConfig } from "@isentinel/jest-roblox";

export default defineConfig({
	extends: "../../jest.shared.ts",
	projects: [
		{
			test: {
				displayName: { name: "jecs", color: "cyan" },
				include: ["src/**/*.spec.ts"],
				mockDataModel: true,
				outDir: "out-test/src",
			},
		},
	],
});
