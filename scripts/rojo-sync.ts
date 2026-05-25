#!/usr/bin/env node

/**
 * Syncs ALL scoped packages (direct + transitive dependencies) to a rojo-sync directory
 * Works with pnpm's isolated node_modules by discovering packages in .pnpm virtual store.
 * Supports multiple scopes (e.g., @rbxts, @rbxts-js) and preserves scope structure in output.
 */

import { parseYAML } from "confbox";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const ROJO_SYNC_BASE_DIR = path.join(PROJECT_ROOT, "rojo-sync");
const NODE_MODULES = path.join(PROJECT_ROOT, "node_modules");

// Scopes to sync (e.g., @rbxts, @rbxts-js)
const SCOPES = ["@rbxts", "@rbxts-js"];

console.log("\n🔍 Discovering all scoped packages (including transitive dependencies)...\n");

/**
 * Parse pnpm-lock.yaml to find ALL packages matching configured scopes (including transitive).
 * This avoids the OOM issues with `pnpm list` on large dependency trees.
 * @returns Map of package name to version for all scoped packages found.
 */
interface PnpmLockfile {
	snapshots: Record<string, unknown>;
}

function isPnpmLockfile(value: unknown): value is PnpmLockfile {
	return (
		typeof value === "object" &&
		value !== null &&
		"snapshots" in value &&
		typeof (value as PnpmLockfile).snapshots === "object"
	);
}

/**
 * Split a multi-document YAML string into individual document strings.
 *
 * Pnpm 11+ emits multiple documents when `configDependencies` are declared:
 * resolved versions and integrity hashes are stored as a separate document in
 * the lockfile (alongside the workspace lockfile document) rather than inlined
 * in `pnpm-workspace.yaml`.
 * @param content - Raw contents of the pnpm-lock.yaml file.
 * @returns Array of document strings, with empty documents stripped.
 */
function splitYamlDocuments(content: string): Array<string> {
	return content.split(/^---\s*$/m).filter((document) => document.trim().length > 0);
}

/**
 * Merge `snapshots` entries from every document in the lockfile.
 *
 * Scope filtering happens downstream, so non-workspace docs (e.g.
 * `@pnpm/trusted-deps`) are harmlessly included.
 * @param content - Raw contents of the pnpm-lock.yaml file.
 * @returns Merged map of snapshot keys from every document.
 */
function readAllSnapshots(content: string): Record<string, unknown> {
	const merged: Record<string, unknown> = {};

	for (const document of splitYamlDocuments(content)) {
		const parsed = parseYAML(document);
		if (isPnpmLockfile(parsed)) {
			Object.assign(merged, parsed.snapshots);
		}
	}

	return merged;
}

/**
 * Create junction/symlink to package.
 * @param sourcePath - Absolute path to package in .pnpm virtual store.
 * @param targetPath - Absolute path to create link at in rojo-sync directory.
 * @returns True if link was created successfully, false otherwise.
 */
function createLink(sourcePath: string, targetPath: string): boolean {
	try {
		if (process.platform === "win32") {
			// Use junction on Windows (no admin needed)
			// cspell:ignore mklink
			execSync(`mklink /J "${targetPath}" "${sourcePath}"`, {
				shell: "cmd.exe",
				stdio: "ignore",
				windowsHide: true,
			});
		} else {
			// Use symlink on Unix
			fs.symlinkSync(sourcePath, targetPath, "dir");
		}

		return true;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  ✗ Failed to link: ${message}`);
		return false;
	}
}

/**
 * Find package location in .pnpm virtual store.
 * Handles truncated package names and hash suffixes used by pnpm.
 * @param packageName - The full package name (e.g., "@rbxts/services").
 * @param version - The package version (e.g., "1.5.4") to help narrow down the search.
 * @returns Absolute path to the package in the virtual store, or null if not found.
 */
function findPackageInVirtualStore(packageName: string, version: string): null | string {
	const pnpmDirectory = path.join(NODE_MODULES, ".pnpm");
	if (!fs.existsSync(pnpmDirectory)) {
		throw new Error(".pnpm virtual store not found. Run pnpm install first.");
	}

	// pnpm stores packages like:
	// .pnpm/@rbxts+services@1.5.4/node_modules/@rbxts/services
	// or (when truncated with hash):
	// .pnpm/@rbxts+flamework-binary-ser_40c4ef7be6e7e40ec981989f4560872e/node_modules/@rbxts/flamework-binary-serializer
	const encodedName = packageName.replace("/", "+");
	const entries = fs.readdirSync(pnpmDirectory);

	// First try: exact match with version
	let matchingDirectory = entries.find((entry) => entry.startsWith(`${encodedName}@${version}`));
	// Second try: match without version (any version of the package)
	matchingDirectory ??= entries.find((entry) => entry.startsWith(`${encodedName}@`));

	// Third try: partial match for truncated names (e.g.,
	// "@rbxts+flamework-binary-ser_hash") pnpm truncates long package names
	// and adds a hash suffix with underscore
	matchingDirectory ??= entries.find((entry) => {
		// Check if entry starts with the beginning of encoded name
		// and contains the package after node_modules
		if (entry.startsWith(encodedName.substring(0, 20))) {
			const testPath = path.join(pnpmDirectory, entry, "node_modules", packageName);
			return fs.existsSync(testPath);
		}

		return false;
	});

	if (matchingDirectory === undefined) {
		return null;
	}

	// Verify the actual package exists in the expected location
	const packagePath = path.join(pnpmDirectory, matchingDirectory, "node_modules", packageName);
	return fs.existsSync(packagePath) ? packagePath : null;
}

function createLinks(allPackages: Map<string, string>): void {
	// Create links for each package, preserving scope structure
	let successCount = 0;
	let failCount = 0;

	for (const [packageName, version] of allPackages.entries()) {
		const sourcePath = findPackageInVirtualStore(packageName, version);

		if (sourcePath === null || !fs.existsSync(sourcePath)) {
			console.warn(`  ⚠️  ${packageName}@${version} - not found in virtual store`);
			failCount++;
			continue;
		}

		// Preserve the full scope structure (e.g., @rbxts/foo ->
		// rojo-sync/@rbxts/foo)
		const targetPath = path.join(ROJO_SYNC_BASE_DIR, packageName);

		// Ensure parent directory exists
		const targetDirectory = path.dirname(targetPath);
		if (!fs.existsSync(targetDirectory)) {
			fs.mkdirSync(targetDirectory, { recursive: true });
		}

		if (createLink(sourcePath, targetPath)) {
			console.log(`  ✓ ${packageName}@${version}`);
			successCount++;
		} else {
			failCount++;
		}
	}

	console.log("\n✨ Sync complete!");
	console.log(`   ✓ ${successCount} packages synced`);
	if (failCount > 0) {
		console.log(`   ✗ ${failCount} packages failed`);
	}
}

function discoverAllPackages(): Map<string, string> {
	const lockfilePath = path.join(PROJECT_ROOT, "pnpm-lock.yaml");

	if (!fs.existsSync(lockfilePath)) {
		throw new Error("pnpm-lock.yaml not found. Run pnpm install first.");
	}

	const lockfileContent = fs.readFileSync(lockfilePath, "utf8");
	const snapshots = readAllSnapshots(lockfileContent);

	if (Object.keys(snapshots).length === 0) {
		throw new Error("Invalid pnpm-lock.yaml: missing snapshots section");
	}

	const allPackages = new Map<string, string>();

	// Iterate through all snapshots to find packages matching any configured
	// scope
	for (const snapshotKey of Object.keys(snapshots)) {
		// Check if the snapshot key starts with any of the configured scopes
		const matchingScope = SCOPES.find((scope) => snapshotKey.startsWith(`${scope}/`));

		if (matchingScope === undefined) {
			continue;
		}

		// Parse the snapshot key to extract package name and version
		// Format: "@scope/package-name@version" or
		// "@scope/package-name@version(peer-deps)"
		const match = snapshotKey.match(/^(@[^/]+\/[^@]+)@([^(]+)/);

		if (match === null) {
			console.warn(`  ⚠️  Could not parse snapshot key: ${snapshotKey}`);
			continue;
		}

		const [, packageName, version] = match;

		// Store the first version we encounter for each package
		// (handles peer dependency variants by taking the first match)
		if (packageName !== undefined && !allPackages.has(packageName) && version !== undefined) {
			allPackages.set(packageName, version);
		}
	}

	return allPackages;
}

/**
 * Main sync logic.
 */
async function syncPackages(): Promise<void> {
	// Discover all packages matching configured scopes by parsing pnpm-lock.yaml
	const allPackages = discoverAllPackages();

	if (allPackages.size === 0) {
		console.error(`❌ No packages found for scopes: ${SCOPES.join(", ")}!`);
		process.exit(1);
	}

	console.log(
		`📦 Found ${allPackages.size} packages across scopes: ${SCOPES.join(", ")} (including transitive dependencies)\n`,
	);

	// Clean and recreate sync directory
	if (fs.existsSync(ROJO_SYNC_BASE_DIR)) {
		console.log("🧹 Cleaning existing sync directory...");
		fs.rmSync(ROJO_SYNC_BASE_DIR, { force: true, recursive: true });
	}

	fs.mkdirSync(ROJO_SYNC_BASE_DIR, { recursive: true });

	createLinks(allPackages);

	console.log(
		`\n📁 Rojo can now sync from: ${path.relative(PROJECT_ROOT, ROJO_SYNC_BASE_DIR)}\n`,
	);
}

// Run
syncPackages().catch((err: unknown) => {
	if (err instanceof Error) {
		console.error("\n❌ Sync failed:", err.message);
	} else {
		console.error("\n❌ Sync failed:", String(err));
	}

	process.exit(1);
});
