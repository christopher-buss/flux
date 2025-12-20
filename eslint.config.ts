import style from "@isentinel/eslint-config";

export default style({
	name: "flux/root",
	flawless: true,
	ignores: ["!.claude"],
	namedConfigs: true,
	react: true,
	test: true,
	type: "package",
});
