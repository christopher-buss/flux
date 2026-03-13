---
name: Benchmarking
description: |
    Performance testing with JestBenchmark, profiling, and custom reporters.
---

# Benchmarking

Roblox-only feature for gating performance in CI and capturing perf metrics.

## Setup

```ts
import {
	benchmark,
	CustomReporters,
	initializeProfiler,
	initializeReporter,
	MetricLogger,
} from "@rbxts/jest-benchmark";
```

## `benchmark(name, fn, timeout)`

Wrapper around `test` with automatic FPS and timing profiling:

```ts
describe("home page benchmarks", () => {
	benchmark("should show first render performance", (Profiler, reporters) => {
		expect.assertions(1);

		render(React.createElement(MyPage));
		const element = screen.getByText("Hello").expect();

		expect(element).never.toBeNil();
	});
});
```

Supports `benchmark.only` and `benchmark.skip`.

The callback receives:

- `Profiler` — controls reporter start/stop
- `reporters` — table of named custom reporters

## Reporters

A `Reporter` collects values during a benchmark and reduces them.

### Creating a Reporter

```ts
function average(numbers: Array<number>): number {
	if (numbers.isEmpty()) {
		return 0;
	}

	let sum = 0;
	for (const value of numbers) {
		sum += value;
	}

	return sum / numbers.size();
}

const avgReporter = initializeReporter("average", average);
```

### Reporter API

```ts
avgReporter.start("section1");
avgReporter.report(10);
avgReporter.report(20);
avgReporter.stop();

const [names, values] = avgReporter.finish();
// names: ["section1"], values: [15]
```

Sections can be nested:

```ts
avgReporter.start("total");

avgReporter.start("part1");
avgReporter.report(1);
avgReporter.report(3);
avgReporter.stop();

avgReporter.start("part2");
avgReporter.report(5);
avgReporter.report(7);
avgReporter.stop();

avgReporter.stop();

const [names, values] = avgReporter.finish();
// names: ["part1", "part2", "total"], values: [2, 6, 4]
```

## Profiler

Controls multiple reporters at once:

```ts
const profiler = initializeProfiler([avgReporter, timeReporter], (metricName, value) => {
	print(metricName, value);
});

profiler.start("render");
// ... benchmark code ...
profiler.stop();
profiler.finish(); // calls outputFn for each metric
```

## Custom Reporters in Benchmarks

Default reporters: FPS and SectionTime. Add custom ones:

```ts
CustomReporters.useCustomReporters({
	renderCount: initializeReporter("renders", (numbers) => {
		let sum = 0;
		for (const value of numbers) {
			sum += value;
		}

		return sum;
	}),
});

benchmark("render count", (Profiler, reporters) => {
	reporters.renderCount.report(getRenderCount());
});

CustomReporters.useDefaultReporters();
```

## Custom Metric Logger

Override the default stdout output:

```ts
const results: Array<{ metric: string; value: number }> = [];

MetricLogger.useCustomMetricLogger((metricName, value) => {
	results.push({ metric: metricName, value });
});

// After benchmarks, output collected results as JSON
print(HttpService.JSONEncode(results));
MetricLogger.useDefaultMetricLogger();
```

<!--
Source references:
- https://github.com/Roblox/jest-roblox/blob/main/docs/docs/JestBenchmarkAPI.md
-->
