import { createCore } from "@flux/core";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const player = Players.LocalPlayer;
const core = createCore({ actions, contexts });
const [handle] = core.subscribe(player, "gameplay");

const activeContexts = new Set<string>();

function toggleContext(): void {
	if (activeContexts.has("menu")) {
		activeContexts.delete("menu");
		core.removeContext(handle, "menu");
	} else {
		activeContexts.add("menu");
		core.addContext(handle, "menu");
	}
}

function updateMovement(state: ReturnType<typeof core.getState>): void {
	const character = player.Character;
	if (character === undefined) {
		return;
	}

	const humanoid = character.FindFirstChildOfClass("Humanoid");
	if (humanoid === undefined) {
		return;
	}

	const direction = state.direction2d("move");
	humanoid.Move(new Vector3(direction.X, 0, direction.Y));

	if (state.pressed("jump")) {
		humanoid.Jump = true;
	}
}

function createStatusGui(): TextLabel {
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "FluxDebug";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = player.WaitForChild("PlayerGui");

	const frame = new Instance("Frame");
	frame.Size = new UDim2(0, 300, 0, 200);
	frame.Position = new UDim2(0, 10, 0, 10);
	frame.BackgroundColor3 = new Color3(0.1, 0.1, 0.1);
	frame.BackgroundTransparency = 0.3;
	frame.BorderSizePixel = 0;
	frame.Parent = screenGui;

	const corner = new Instance("UICorner");
	corner.CornerRadius = new UDim(0, 8);
	corner.Parent = frame;

	const padding = new Instance("UIPadding");
	padding.PaddingTop = new UDim(0, 10);
	padding.PaddingLeft = new UDim(0, 10);
	padding.Parent = frame;

	const label = new Instance("TextLabel");
	label.Size = new UDim2(1, -20, 1, -20);
	label.BackgroundTransparency = 1;
	label.TextColor3 = new Color3(1, 1, 1);
	label.TextXAlignment = Enum.TextXAlignment.Left;
	label.TextYAlignment = Enum.TextYAlignment.Top;
	label.FontFace = Font.fromEnum(Enum.Font.RobotoMono);
	label.TextSize = 14;
	label.Parent = frame;

	return label;
}

const statusLabel = createStatusGui();

RunService.Heartbeat.Connect((deltaTime) => {
	core.update(deltaTime);

	const state = core.getState(handle);

	if (state.justPressed("toggleContext")) {
		toggleContext();
	}

	updateMovement(state);

	const move = state.direction2d("move");
	const activeContext = activeContexts.has("menu") ? "menu" : "gameplay";
	statusLabel.Text = [
		"[Flux E2E — Server Authority]",
		`context: ${activeContext}`,
		`move: (${string.format("%.1f", move.X)}, ${string.format("%.1f", move.Y)})`,
		`jump: ${state.pressed("jump")}`,
		`jump duration: ${string.format("%.2f", state.currentDuration("jump"))}s`,
		`toggle: ${state.pressed("toggleContext")}`,
	].join("\n");
});
