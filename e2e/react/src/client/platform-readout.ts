import { getInputPlatform, onInputPlatformChanged, setInputPlatformOverride } from "@flux/core";
import type { InputPlatform } from "@flux/core";

/** What the override cycles through, ending back on the real device. */
const OVERRIDE_CYCLE = [undefined, "keyboard", "gamepad", "touch"] as const satisfies ReadonlyArray<
	InputPlatform | undefined
>;

/**
 * Builds a platform readout with no React anywhere in it.
 *
 * The point of the surface: it sits beside the React panel and must always
 * agree with it, including while an override is forced. A platform signal that
 * only convinced the React tree would show up here as two rows disagreeing.
 * @param parent - The `PlayerGui` to parent the readout under.
 */
export function mountPlatformReadout(parent: Instance): void {
	const screen = new Instance("ScreenGui");
	screen.ResetOnSpawn = false;

	const label = new Instance("TextLabel");
	label.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
	label.BackgroundTransparency = 0.3;
	label.BorderSizePixel = 0;
	label.FontFace = Font.fromEnum(Enum.Font.RobotoMono);
	label.Position = new UDim2(0, 10, 0, 365);
	label.Size = new UDim2(0, 300, 0, 28);
	label.TextColor3 = new Color3(0.6, 1, 0.6);
	label.TextSize = 14;

	function render(platform: InputPlatform): void {
		label.Text = ` no-react getInputPlatform(): ${platform}`;
	}

	render(getInputPlatform());
	onInputPlatformChanged(render);

	label.Parent = screen;
	screen.Parent = parent;
}

/**
 * Builds a toggle that advances the platform override one step, wrapping back
 * to the real device.
 *
 * Driven from the heartbeat loop rather than from a component, so the toggle
 * itself is a non-React caller too.
 * @returns A function that applies the next override in the cycle.
 */
export function createPlatformOverrideCycle(): () => void {
	let index = 0;

	return () => {
		index = (index + 1) % OVERRIDE_CYCLE.size();
		setInputPlatformOverride(OVERRIDE_CYCLE[index]);
	};
}
