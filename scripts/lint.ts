import { main, readSettings } from "@isentinel/hooks/lint";

const targets =
	process.argv.length > 2
		? process.argv.slice(2).map((argument) => argument.replaceAll("\\", "/"))
		: ["."];

const settings = readSettings();
main(targets, settings);
