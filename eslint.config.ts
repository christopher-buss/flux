import isentinel, { GLOB_MARKDOWN_CODE, GLOB_SRC } from "@isentinel/eslint-config";

export default isentinel(
	{
		name: "flux/root",
		flawless: true,
		ignores: ["!.claude", "flux"],
		namedConfigs: true,
		react: true,
		roblox: {
			files: [`packages/*/*/${GLOB_SRC}`],
			filesTypeAware: [`packages/*/*/${GLOB_SRC}`],
		},
		test: {
			jest: {
				extended: true,
			},
		},
		type: "package",
		typescript: {
			overridesTypeAware: {
				"ts/no-deprecated": "error",
				"ts/only-throw-error": [
					"error",
					{
						allow: [
							{ name: "Error", from: "file" },
							{ name: "FluxError", from: "file" },
							{ name: "ContextError", from: "file" },
							{ name: "HandleError", from: "file" },
						],
					},
				],
			},
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
			"ts/no-unused-private-class-members": "off",
		},
	},
	{
		name: "project/type-tests",
		files: ["**/*.spec-d.ts"],
		rules: {
			"max-lines-per-function": "off",
		},
	},
);
