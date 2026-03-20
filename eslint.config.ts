import isentinel, { GLOB_MARKDOWN_CODE, GLOB_ROOT_SRC, GLOB_SRC } from "@isentinel/eslint-config";

export default isentinel(
	{
		name: "flux/root",
		flawless: true,
		ignores: ["!.claude", "flux"],
		namedConfigs: true,
		react: true,
		roblox: {
			files: [...GLOB_ROOT_SRC],
			filesTypeAware: [...GLOB_ROOT_SRC],
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
);
