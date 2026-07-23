#!/usr/bin/env bun

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const NODE_MODULES = path.join(PROJECT_ROOT, "node_modules");
const PACKAGE_MAP = path.join(NODE_MODULES, ".package-map.json");

const OUTPUT_DIR = NODE_MODULES;

const SCOPES = ["@rbxts", "@rbxts-js"];
const GLOB_IGNORE_PATHS = ["**/.package-lock.json", "**/package.json", "**/tsconfig.json"];

/** Trailing peer-dependency suffix pnpm appends to a package-map key. */
const PEER_SUFFIX_PATTERN = /\(.*\)$/s;
/** Separators between the parts of a semver string. */
const VERSION_PART_SEPARATOR = /[-+.]/;
/** Sorts package names in the default locale, matching `localeCompare()`. */
const NAME_COLLATOR = new Intl.Collator();

interface PackageEntry {
	dependencies?: Record<string, string>;
	url: string;
}

interface PackageMap {
	packages: Record<string, PackageEntry>;
}

interface ProjectNode {
	$className?: string;
	$path?: string;
	[child: string]: ProjectNode | string | undefined;
}

function toRelative(absolute: string): string {
	return path.relative(OUTPUT_DIR, absolute).split(path.sep).join("/");
}

function assertPackageMap(value: unknown): asserts value is PackageMap {
	if (
		typeof value !== "object" ||
		value === null ||
		!("packages" in value) ||
		typeof value.packages !== "object" ||
		value.packages === null ||
		!("." in value.packages) ||
		typeof value.packages["."] !== "object" ||
		value.packages["."] === null ||
		!("url" in value.packages["."]) ||
		value.packages["."].url === undefined
	) {
		throw new Error(
			`${PACKAGE_MAP} is malformed. pnpm generates it during install; run "pnpm install" to recreate it.`,
		);
	}
}

function isScoped(name: string): boolean {
	return SCOPES.some((scope) => name.startsWith(`${scope}/`));
}

function parseKey(key: string): { name: string; version: string } {
	const withoutSuffix = key.replace(PEER_SUFFIX_PATTERN, "");
	const at = withoutSuffix.lastIndexOf("@");
	assert.ok(at > 0, `Unparsable package-map key: ${key}`);
	return { name: withoutSuffix.slice(0, at), version: withoutSuffix.slice(at + 1) };
}

function compareVersions(left: string, right: string): number {
	const leftParts = left.split(VERSION_PART_SEPARATOR);
	const rightParts = right.split(VERSION_PART_SEPARATOR);
	for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
		const leftPart = leftParts[index] ?? "";
		const rightPart = rightParts[index] ?? "";
		const leftNumber = Number(leftPart);
		const rightNumber = Number(rightPart);
		if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
			if (leftNumber !== rightNumber) {
				return leftNumber - rightNumber;
			}
		} else {
			const compared = leftPart.localeCompare(rightPart);
			if (compared !== 0) {
				return compared;
			}
		}
	}

	return 0;
}

function directWinners(map: PackageMap): Map<string, string> {
	const winners = new Map<string, string>();
	const rootDependencies = map.packages["."]?.dependencies ?? {};

	for (const [name, fullKey] of Object.entries(rootDependencies)) {
		if (isScoped(name)) {
			winners.set(name, fullKey);
		}
	}

	return winners;
}

function transitiveCandidates(
	map: PackageMap,
	resolved: Map<string, string>,
): Map<string, Array<string>> {
	const candidates = new Map<string, Array<string>>();

	for (const key of Object.keys(map.packages)) {
		if (key === "." || key.replace(PEER_SUFFIX_PATTERN, "").lastIndexOf("@") <= 0) {
			continue;
		}

		const { name } = parseKey(key);
		if (!isScoped(name) || resolved.has(name)) {
			continue;
		}

		const existing = candidates.get(name) ?? [];
		existing.push(key);
		candidates.set(name, existing);
	}

	return candidates;
}

function highestVersion(keys: Array<string>): string {
	return keys.reduce((best, key) => {
		return compareVersions(parseKey(key).version, parseKey(best).version) > 0 ? key : best;
	});
}

function resolveWinners(map: PackageMap): Map<string, string> {
	const winners = directWinners(map);

	for (const [name, keys] of transitiveCandidates(map, winners)) {
		const winner = highestVersion(keys);
		if (keys.length > 1) {
			const versions = keys.map((key) => parseKey(key).version).join(", ");
			console.warn(
				`⚠️  transitive version collision for ${name}: [${versions}] -> chose ${parseKey(winner).version}`,
			);
		}

		winners.set(name, winner);
	}

	return winners;
}

/**
 * Mirror how roblox-ts resolves a dependency's instance name: a package that
 * ships its own default.project.json is mapped through it (fromPath -> the
 * project `name`, e.g. @rbxts-js/jest -> "Jest"); a package without one falls
 * back to a synthetic resolver keyed on the directory name. Importers (incl.
 * Prebuilt packages) bake requires the same way, so the tree must match.
 * @param absolute - Absolute path to the package directory.
 * @param fallback - Instance name to use when the package ships no project file.
 * @returns The instance name roblox-ts would give this package.
 */
function packageInstanceName(absolute: string, fallback: string): string {
	const projectFile = path.join(absolute, "default.project.json");
	if (fs.existsSync(projectFile)) {
		const parsed = JSON.parse(fs.readFileSync(projectFile, "utf8"));
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"name" in parsed &&
			typeof parsed["name"] === "string" &&
			parsed["name"].length > 0
		) {
			return parsed["name"];
		}
	}

	return fallback;
}

/**
 * Group the resolved packages into one tree per scope.
 *
 * A Rojo node that mounts a project through `$path` merges its own children in
 * only when the names do not collide, so each scope gets its own project file:
 * package project files add `@rbxts/flux*` entries under `@rbxts`, and mounting
 * a combined project there would yield two sibling `@rbxts` folders instead of
 * one merged folder.
 * @param map - Parsed pnpm package-map.
 * @param winners - Resolved package name -> package-map key.
 * @returns Map of scope (e.g. `@rbxts`) to that scope's project tree.
 */
function buildScopeTrees(map: PackageMap, winners: Map<string, string>): Map<string, ProjectNode> {
	const scopeNodes = new Map<string, ProjectNode>();

	const sortedWinners = [...winners].toSorted(([left], [right]) => {
		return NAME_COLLATOR.compare(left, right);
	});

	for (const [name, fullKey] of sortedWinners) {
		const slash = name.indexOf("/");
		const scope = name.slice(0, slash);
		const bare = name.slice(slash + 1);

		const entry = map.packages[fullKey];
		assert.ok(entry !== undefined, `package-map has no entry for resolved key: ${fullKey}`);

		const absolute = path.resolve(NODE_MODULES, entry.url);
		assert.ok(fs.existsSync(absolute), `package directory missing on disk: ${absolute}`);

		let node = scopeNodes.get(scope);
		if (node === undefined) {
			node = { $className: "Folder" };
			scopeNodes.set(scope, node);
		}

		node[packageInstanceName(absolute, bare)] = { $path: toRelative(absolute) };
	}

	return scopeNodes;
}

function writeScopeProject(scope: string, tree: ProjectNode): void {
	const output = path.join(OUTPUT_DIR, `${scope}.project.json`);
	const project = { name: scope, globIgnorePaths: GLOB_IGNORE_PATHS, tree };

	fs.writeFileSync(output, `${JSON.stringify(project, undefined, "\t")}\n`);

	const packageCount = Object.keys(tree).length - 1;
	console.log(`✓ wrote ${path.relative(PROJECT_ROOT, output)} (${packageCount} packages)`);
}

function main(): void {
	assert.ok(
		fs.existsSync(PACKAGE_MAP),
		`${PACKAGE_MAP} not found. pnpm generates it during install; run "pnpm install" to recreate it.`,
	);

	const map = JSON.parse(fs.readFileSync(PACKAGE_MAP, "utf8")) as unknown;
	assertPackageMap(map);

	const winners = resolveWinners(map);
	assert.ok(winners.size > 0, `no scoped packages (${SCOPES.join(", ")}) found in package-map`);

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	for (const [scope, tree] of buildScopeTrees(map, winners)) {
		writeScopeProject(scope, tree);
	}
}

main();
