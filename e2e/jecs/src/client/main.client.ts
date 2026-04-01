import type { ActionState } from "@rbxts/flux";
import { createFluxJecs } from "@rbxts/flux-jecs";
import Jecs from "@rbxts/jecs";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const player = Players.LocalPlayer;
const world = Jecs.world();
// eslint-disable-next-line flawless/naming-convention -- Jecs component convention
const ActionState = world.component<ActionState<typeof actions>>();
const flux = createFluxJecs(world, {
	actions,
	actionStateComponent: ActionState,
	contexts,
});

const entity = world.entity();
flux.register(entity, player, "gameplay");

function updateMovement(): void {
	const character = player.Character;
	if (character === undefined) {
		return;
	}

	const humanoid = character.FindFirstChildOfClass("Humanoid");
	if (humanoid === undefined) {
		return;
	}

	humanoid.SetStateEnabled(Enum.HumanoidStateType.Jumping, false);

	const state = flux.getState(entity);
	const direction = state.direction2d("move");
	humanoid.Move(new Vector3(direction.X, 0, direction.Y));

	if (state.justPressed("jump")) {
		humanoid.ChangeState(Enum.HumanoidStateType.Jumping);
	}
}

function createStatusGui(): TextLabel {
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "FluxJecsDebug";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = player.WaitForChild("PlayerGui");

	const frame = new Instance("Frame");
	frame.Size = new UDim2(0, 300, 0, 150);
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
	flux.update(deltaTime);

	updateMovement();

	// Query all entities with ActionState + gameplay context
	let entityCount = 0;
	for (const [, state] of world.query(ActionState, flux.contexts.gameplay)) {
		entityCount += 1;
		state.pressed("jump");
	}

	const state = flux.getState(entity);
	const move = state.direction2d("move");
	statusLabel.Text = [
		"[Flux Jecs E2E]",
		`entities with ActionState+gameplay: ${entityCount}`,
		`move: (${string.format("%.1f", move.X)}, ${string.format("%.1f", move.Y)})`,
		`jump: ${state.pressed("jump")}`,
	].join("\n");
});
