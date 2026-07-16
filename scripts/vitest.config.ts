import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		clearMocks: true,
		coverage: {
			include: ["hooks/worktree-create.ts", "hooks/worktree-remove.ts"],
			thresholds: {
				branches: 100,
				functions: 100,
				lines: 100,
				statements: 100,
			},
		},
		include: ["**/*.spec.ts"],
		restoreMocks: true,
		unstubEnvs: true,
	},
});
