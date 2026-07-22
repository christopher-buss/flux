import { GLOB_SRC, GLOB_TESTS } from "@isentinel/eslint-config";
import { isentinel } from "@isentinel/eslint-config/oxlint";

export default isentinel(
	{
		name: "project/options",
		ignores: ["fixtures", "_fixtures", "**/constants-generated.ts"],
		jsPlugins: false,
		options: {
			typeAware: true,
		},
		react: true,
		roblox: {
			files: [`packages/*/*/${GLOB_SRC}`, `e2e/*/*/${GLOB_SRC}`],
			filesTypeAware: [`packages/*/*/${GLOB_SRC}`, `e2e/*/*/${GLOB_SRC}`],
		},
		test: {
			jest: {
				extended: true,
				files: [
					...GLOB_TESTS.map((path) => `packages/*/*/src/${path}`),
					...GLOB_TESTS.map((path) => `packages/*/*/test/${path}`),
				],
			},
			vitest: {
				extended: true,
				files: [...GLOB_TESTS.map((path) => `scripts/${path}`)],
			},
		},
		type: "package",
	},
	{
		name: "project/github-required-filenames",
		files: [".github/FUNDING.{yml,yaml}", ".github/ISSUE_TEMPLATE/**"],
		rules: {
			"unicorn/filename-case": "off",
		},
	},
);
