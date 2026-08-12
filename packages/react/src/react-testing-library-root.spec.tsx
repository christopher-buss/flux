import { cleanup, render } from "@flux/test-utils/react-testing-library-lua";
import { unstable_NormalPriority, unstable_scheduleCallback } from "@flux/test-utils/scheduler";
import { describe, expect, it } from "@rbxts/jest-globals";
import { afterThis } from "@rbxts/jest-utils";
import React, { useEffect, useState } from "@rbxts/react";

/**
 * Schedules one callback on mount and renders whether it has run yet. The
 * callback sits on the scheduler the reconciler shares, so it only lands if
 * something drained that queue.
 *
 * @returns A label reading `pending` until the queue is drained.
 */
function SchedulerProbe(): React.ReactNode {
	const [status, setStatus] = useState("pending");

	useEffect(() => {
		unstable_scheduleCallback(unstable_NormalPriority, () => {
			setStatus("drained");
		});
	}, []);

	return <textlabel Text={`status:${status}`} />;
}

describe("the testing library's root", () => {
	it("should drain scheduled work before render returns", () => {
		expect.assertions(1);

		afterThis(cleanup);

		// This is the whole reason RTL is patched. A legacy root takes `act`
		// from the bundled react-dom copy, which knows nothing about react-lua's
		// scheduler and leaves the callback queued; `ReactRoblox.act` on a
		// concurrent root drains it. Locks
		// `patches/@rbxts-js__react-testing-library-lua@...` — drop either hunk
		// and this reads `status:pending`.
		const { queryByText } = render(<SchedulerProbe />);

		expect(queryByText("status:drained")).toBeDefined();
	});
});
