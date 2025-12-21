import style, { GLOB_ROOT_SRC } from "@isentinel/eslint-config";

export default style({
	name: "flux/root",
	flawless: true,
	ignores: ["!.claude"],
	namedConfigs: true,
	react: true,
	roblox: {
		files: [...GLOB_ROOT_SRC],
		filesTypeAware: [...GLOB_ROOT_SRC],
	},
	test: true,
	type: "package",
});
