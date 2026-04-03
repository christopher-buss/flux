import { createCore } from "@flux/core";
import { Players, RunService, Workspace } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const INTERACT_RANGE = 10;

const player = Players.LocalPlayer;
const core = createCore({ actions, contexts });
const [handle] = core.subscribe(player, "gameplay");

const interactable = Workspace.WaitForChild("Interactable") as Part;
const defaultColor = interactable.Color;

const billboardGui = new Instance("BillboardGui");
billboardGui.Size = new UDim2(0, 200, 0, 50);
billboardGui.StudsOffset = new Vector3(0, 3, 0);
billboardGui.AlwaysOnTop = true;
billboardGui.Adornee = interactable;
billboardGui.Enabled = false;
billboardGui.Parent = interactable;

const promptLabel = new Instance("TextLabel");
promptLabel.Size = new UDim2(1, 0, 1, 0);
promptLabel.BackgroundTransparency = 1;
promptLabel.TextColor3 = new Color3(1, 1, 1);
promptLabel.TextStrokeTransparency = 0.5;
promptLabel.FontFace = Font.fromEnum(Enum.Font.GothamBold);
promptLabel.TextSize = 16;
promptLabel.Text = "[E] Hold to interact";
promptLabel.Parent = billboardGui;

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

function getInteractStatus(state: ReturnType<typeof core.getState>): string {
	if (state.ongoing("interact")) {
		return "holding...";
	}

	if (state.pressed("interact")) {
		return "triggered";
	}

	return "idle";
}

function isNearInteractable(): boolean {
	const character = player.Character;
	if (character === undefined) {
		return false;
	}

	const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (root === undefined) {
		return false;
	}

	return root.Position.sub(interactable.Position).Magnitude < INTERACT_RANGE;
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

	humanoid.SetStateEnabled(Enum.HumanoidStateType.Jumping, false);

	const direction = state.direction2d("move");
	humanoid.Move(new Vector3(direction.X, 0, direction.Y));

	if (state.justPressed("jump")) {
		humanoid.ChangeState(Enum.HumanoidStateType.Jumping);
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

function buildStatusText(state: ReturnType<typeof core.getState>, isNearby: boolean): string {
	const move = state.direction2d("move");
	const activeContext = activeContexts.has("menu") ? "menu" : "gameplay";
	return [
		"[Flux E2E]",
		`context: ${activeContext}`,
		`move: (${string.format("%.1f", move.X)}, ${string.format("%.1f", move.Y)})`,
		`fire: ${state.pressed("fire") ? "pressed" : ""}`,
		`jump: ${state.pressed("jump")}`,
		`interact: ${isNearby ? "nearby" : "far"} | ${getInteractStatus(state)}`,
		`interact duration: ${string.format("%.2f", state.currentDuration("interact"))}s`,
		`toggle: ${activeContexts.has("menu")}`,
	].join("\n");
}

RunService.Heartbeat.Connect((deltaTime) => {
	core.update(deltaTime);

	const state = core.getState(handle);

	if (state.justPressed("toggleContext")) {
		toggleContext();
	}

	updateMovement(state);

	const isNearby = isNearInteractable();
	billboardGui.Enabled = isNearby;

	if (isNearby && state.ongoing("interact")) {
		promptLabel.Text = `Holding... ${string.format("%.1f", state.currentDuration("interact"))}s`;
	} else if (isNearby && state.justPressed("interact")) {
		interactable.Color =
			interactable.Color === defaultColor ? new Color3(0.0, 1.0, 0.2) : defaultColor;
		promptLabel.Text = "Interacted!";
	} else {
		promptLabel.Text = "[E] Hold to interact";
	}

	statusLabel.Text = buildStatusText(state, isNearby);
});
