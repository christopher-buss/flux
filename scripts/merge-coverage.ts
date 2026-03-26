import libCoverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";
import { globSync, readFileSync } from "node:fs";
import process from "node:process";

function mergeCoverage(): void {
	const coverageFiles = globSync("{packages,apps}/*/coverage/coverage-final.json");

	if (coverageFiles.length === 0) {
		console.log("No coverage files found");
		process.exit(0);
	}

	console.log("Merging coverage from:", coverageFiles);

	const map = libCoverage.createCoverageMap({});

	for (const file of coverageFiles) {
		const data = JSON.parse(readFileSync(file, "utf8")) as libCoverage.CoverageMapData;
		map.merge(data);
	}

	const context = libReport.createContext({
		coverageMap: map,
		dir: "./coverage",
	});

	reports.create("json", { file: "coverage-final.json" }).execute(context);
	reports.create("json-summary", { file: "coverage-summary.json" }).execute(context);
	reports.create("lcov").execute(context);

	console.log("Coverage reports merged to ./coverage");
}

mergeCoverage();
