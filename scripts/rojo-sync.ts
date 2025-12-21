#!/usr/bin/env node

/**
 * Syncs ALL scoped packages (direct + transitive dependencies) to a rojo-sync
 * directory Works with pnpm's isolated node_modules by discovering packages in
 * .pnpm virtual store. Supports multiple scopes (e.g., @rbxts, @rbxts-js) and
 * preserves scope structure in output.
 */

import { parseYAML } from "confbox";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

interface PnpmLockfile {
	readonly snapshots?: Record<string, unknown>;
}

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const ROJO_SYNC_BASE_DIR = path.join(PROJECT_ROOT, "rojo-sync");
const NODE_MODULES = path.join(PROJECT_ROOT, "node_modules");

// Scopes to sync (e.g., @rbxts, @rbxts-js)
const SCOPES = ["@rbxts", "@rbxts-js"] as const;

console.log("\n🔍 Discovering all scoped packages (including transitive dependencies)...\n");

/**
 * Create junction/symlink to package.
 *
 * @param sourcePath - Source package path.
 * @param targetPath - Destination path where the link will be created.
 * @returns True if link created successfully.
 */
function createLink(sourcePath: string, targetPath: string): boolean {
	try {
		if (process.platform === "win32") {
			// cspell:ignore mklink
			execSync(`mklink /J "${targetPath}" "${sourcePath}"`, {
				shell: "cmd.exe",
				stdio: "ignore",
			});
		} else {
			fs.symlinkSync(sourcePath, targetPath, "dir");
		}

		return true;
	} catch (err: unknown) {
		if (err instanceof Error) {
			console.error(`  ✗ Failed to link: ${err.message}`);
		} else {
			console.error("  ✗ Failed to link:", err);
		}

		return false;
	}
}

/**
 * Create links for all discovered packages.
 *
 * @param allPackages - Map of package names to versions.
 */
function createLinks(allPackages: Map<string, string>): void {
	let successCount = 0;
	let failCount = 0;

	for (const [packageName, version] of allPackages.entries()) {
		const sourcePath = findPackageInVirtualStore(packageName, version);
		if (sourcePath === undefined || !fs.existsSync(sourcePath)) {
			console.warn(`  ⚠️  ${packageName}@${version} - not found in virtual store`);
			failCount++;
			continue;
		}

		// Preserve the full scope structure (e.g., @rbxts/foo ->
		// rojo-sync/@rbxts/foo)
		const targetPath = path.join(ROJO_SYNC_BASE_DIR, packageName);
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

/**
 * Parse pnpm-lock.yaml to find ALL packages matching configured scopes
 * (including transitive).
 *
 * @returns Map of package names to versions.
 */
function discoverAllPackages(): Map<string, string> {
	const lockfilePath = path.join(PROJECT_ROOT, "pnpm-lock.yaml");
	if (!fs.existsSync(lockfilePath)) {
		throw new Error("pnpm-lock.yaml not found. Run pnpm install first.");
	}

	const lockfile = parseYAML<PnpmLockfile>(fs.readFileSync(lockfilePath, "utf8"));
	if (!lockfile.snapshots) {
		throw new Error("Invalid pnpm-lock.yaml: missing snapshots section");
	}

	const allPackages = new Map<string, string>();

	for (const snapshotKey of Object.keys(lockfile.snapshots)) {
		if (SCOPES.find((scope) => snapshotKey.startsWith(`${scope}/`)) === undefined) {
			continue;
		}

		// Parse the snapshot key to extract package name and version
		// Format: "@scope/package-name@version" or
		// "@scope/package-name@version(peer-deps)"
		const match = snapshotKey.match(/^(@[^/]+\/[^@]+)@([^(]+)/);
		if (!match) {
			console.warn(`  ⚠️  Could not parse snapshot key: ${snapshotKey}`);
			continue;
		}

		const [, packageName, version] = match;
		if (packageName === undefined || version === undefined) {
			console.warn(`  ⚠️  Invalid package name or version in snapshot key: ${snapshotKey}`);
			continue;
		}

		// Store the first version we encounter for each package
		// (handles peer dependency variants by taking the first match)
		if (!allPackages.has(packageName)) {
			allPackages.set(packageName, version);
		}
	}

	return allPackages;
}

/**
 * Find package location in .pnpm virtual store. Handles truncated package names
 * and hash suffixes used by pnpm.
 *
 * @param packageName - Package name to find.
 * @param version - The version string to match in the .pnpm directory
 *   structure.
 * @returns Path to package or null if not found.
 */
function findPackageInVirtualStore(packageName: string, version: string): string | undefined {
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
		return undefined;
	}

	const packagePath = path.join(pnpmDirectory, matchingDirectory, "node_modules", packageName);
	return fs.existsSync(packagePath) ? packagePath : undefined;
}

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

syncPackages().catch((err: unknown) => {
	if (err instanceof Error) {
		console.error("\n❌ Sync failed:", err.message);
	} else {
		console.error("\n❌ Sync failed:", err);
	}

	process.exit(1);
});
