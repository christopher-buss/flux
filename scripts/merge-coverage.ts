import CoverageReport from "monocart-coverage-reports";
import { globSync } from "node:fs";
import process from "node:process";

async function mergeCoverage(): Promise<void> {
	const coverageDirectories = globSync("{packages,apps}/*/coverage").map(
		(directory) => `./${directory}`,
	);

	if (coverageDirectories.length === 0) {
		console.log("No coverage directories found");
		process.exit(0);
	}

	console.log("Merging coverage from:", coverageDirectories);

	const report = CoverageReport({
		inputDir: coverageDirectories,
		outputDir: "./coverage",
		reports: [
			["json", { file: "coverage-final.json" }],
			["json-summary", { file: "coverage-summary.json" }],
			["lcov"],
			["console-details"],
		],
	});

	await report.generate();
	console.log("Coverage reports merged to ./coverage");
}

mergeCoverage().catch((err: unknown) => {
	console.error("Failed to merge coverage:", err);
	process.exit(1);
});
