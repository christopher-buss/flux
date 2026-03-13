---
name: Configuration
description: jest.config.ts options and runCLI entrypoint setup.
---

# Configuration

## Config File

Create `jest.config.ts` in your project root:

```ts
export = {
	testMatch: ["**/*.spec"],
	verbose: true,
};
```

## `runCLI` Entrypoint

```ts
import Jest from "@rbxts/jest";

const [status, result] = Jest.runCLI(
	rootDir,
	{
		ci: true,
		verbose: true,
	},
	[rootDir],
).awaitStatus();
```

Arguments: `runCLI(rootDir, options, projects)`.

## Configuration Options

| Option                   | Type            | Default                                          | Description                                        |
| ------------------------ | --------------- | ------------------------------------------------ | -------------------------------------------------- |
| `clearMocks`             | boolean         | `false`                                          | Auto-clear mocks before each test                  |
| `displayName`            | string/table    | `nil`                                            | Label for multi-project output                     |
| `projects`               | Instance[]      | `nil`                                            | Array of project root Instances                    |
| `rootDir`                | Instance        | config dir                                       | Root directory for scanning                        |
| `roots`                  | Instance[]      | `{rootDir}`                                      | Directories to search for tests                    |
| `setupFiles`             | ModuleScript[]  | `{}`                                             | Run before test framework install                  |
| `setupFilesAfterEnv`     | ModuleScript[]  | `{}`                                             | Run after framework install                        |
| `testMatch`              | string[]        | `{"**/__tests__/**/*", "**/?(*.)+(spec\|test)"}` | Glob patterns for test files                       |
| `testRegex`              | string/string[] | `{}`                                             | Regex patterns (mutually exclusive with testMatch) |
| `testPathIgnorePatterns` | string[]        | `{}`                                             | Patterns to exclude                                |
| `testTimeout`            | number          | `5000`                                           | Default test timeout (ms)                          |
| `testFailureExitCode`    | number          | `1`                                              | Exit code on failure                               |
| `slowTestThreshold`      | number          | `5`                                              | Seconds before flagging slow tests                 |
| `verbose`                | boolean         | `false`                                          | Show individual test results                       |

## Reporters

```ts
export = {
	reporters: ["default", { options: { key: "value" }, reporter: Workspace.MyReporter }],
};
```

Built-in reporters: `"default"`, `"summary"`, `"github-actions"`.

## Snapshot Options

```ts
export = {
	snapshotFormat: {
		printInstanceDefaults: false,
		printInstanceTags: true,
		redactStackTracesInStrings: false,
		useStyledProperties: false,
	},
	snapshotSerializers: [Workspace.mySerializer],
};
```

## Setup Files

`setupFilesAfterEnv` is where you register custom matchers or global config:

```ts
// setupJest.ts
import { expect } from "@rbxts/jest-globals";

expect.extend({
	customMatcher(received: unknown) {
		return { message: () => "", pass: true };
	},
});
```

```ts
// jest.config.ts
export = {
	setupFilesAfterEnv: [script.Parent.setupJest],
};
```

## Roblox-Specific Options

### `mockDataModel` (boolean)

Enables instance mocking features. Allows `jest.spyOn(game, "GetService")`. Only
whitelisted instances (currently `game`) are supported.

### `oldFunctionSpying` (boolean)

Controls how `jest.spyOn()` overwrites methods:

- `true` — replaces with mock object (old behavior)
- `false` — replaces with forwarding function (new behavior)

## CLI Options

| Option                   | Description                               |
| ------------------------ | ----------------------------------------- |
| `ci`                     | Fail on new snapshots instead of creating |
| `clearMocks`             | Auto-clear mocks                          |
| `resetMocks`             | Auto-reset mocks                          |
| `debug`                  | Print config debug info                   |
| `expand`                 | Show full diffs                           |
| `json`                   | JSON output                               |
| `listTests`              | List test files and exit                  |
| `noStackTrace`           | Omit stack traces                         |
| `passWithNoTests`        | Pass when no tests found                  |
| `showConfig`             | Print config and exit                     |
| `updateSnapshot`         | Re-record failing snapshots               |
| `testMatch`              | Override glob patterns                    |
| `testNamePattern`        | Filter by test name regex                 |
| `testPathPattern`        | Filter by file path regex                 |
| `testPathIgnorePatterns` | Exclude file paths                        |
| `testTimeout`            | Override timeout                          |
| `verbose`                | Show individual results                   |

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/Configuration.md
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/CLI.md
-->
