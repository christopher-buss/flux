import isentinel, { GLOB_ROOT_SRC } from "@isentinel/eslint-config";

export default isentinel({
	name: "flux/root",
	flawless: true,
	ignores: ["!.claude", "flux"],
	namedConfigs: true,
	react: true,
	roblox: {
		files: [...GLOB_ROOT_SRC],
		filesTypeAware: [...GLOB_ROOT_SRC],
	},
	test: true,
	type: "package",
	typescript: {
		parserOptionsTypeAware: {
			projectService: true,
		},
	},
});
