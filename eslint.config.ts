import isentinel, { GLOB_MARKDOWN_CODE, GLOB_SRC, GLOB_TESTS } from "@isentinel/eslint-config";

export default isentinel(
	{
		name: "flux/root",
		ignores: ["flux"],
		naming: true,
		oxlint: "native",
		react: {
			overrides: {
				"react/immutability": "off",
			},
		},
		roblox: {
			files: [`packages/*/*/${GLOB_SRC}`],
			filesTypeAware: [`packages/*/*/${GLOB_SRC}`],
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
				extended: false,
				files: [...GLOB_TESTS.map((path) => `scripts/${path}`)],
			},
		},
		type: "package",
		typescript: {
			parserOptionsTypeAware: {
				projectService: true,
			},
		},
	},
	{
		name: "project/jsdoc",
		files: [GLOB_SRC],
		ignores: [GLOB_MARKDOWN_CODE],
		rules: {
			"jsdoc/require-jsdoc": [
				"warn",
				{
					contexts: [
						"TSInterfaceDeclaration",
						"TSTypeAliasDeclaration",
						"TSEnumDeclaration",
						"TSMethodSignature",
						"TSPropertySignature",
					],
					publicOnly: { ancestorsOnly: true },
					require: {
						ArrowFunctionExpression: true,
						ClassDeclaration: true,
						FunctionDeclaration: true,
						FunctionExpression: true,
						MethodDefinition: true,
					},
				},
			],
		},
	},
	{
		name: "project/markdown",
		files: [GLOB_MARKDOWN_CODE],
		rules: {
			"flawless/max-lines-per-function": "off",
			"ts/no-unused-private-class-members": "off",
		},
	},
	{
		name: "project/type-tests",
		files: ["**/*.spec-d.ts"],
		rules: {
			"flawless/max-lines-per-function": "off",
		},
	},
);
