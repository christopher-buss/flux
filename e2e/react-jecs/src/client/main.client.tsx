import type { ActionState } from "@rbxts/flux";
import type { FluxJecs } from "@rbxts/flux-jecs";
import { createFluxJecs } from "@rbxts/flux-jecs";
import { createFluxReact } from "@rbxts/flux-react";
import Jecs from "@rbxts/jecs";
import React, { useEffect } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

// The point of this game: a jecs + React consumer with no
// `as unknown as InputHandle` cast anywhere. Every call below takes the entity.

const player = Players.LocalPlayer;
const world = Jecs.world();
const ActionState = world.component<ActionState<typeof actions>>();
const flux = createFluxJecs(world, { actions, actionStateComponent: ActionState, contexts });

const playerEntity = world.entity();
flux.register(playerEntity, player, "gameplay");

const {
	flush,
	FluxProvider,
	useAction,
	useActiveContext,
	useBindings,
	useFluxCore,
	useFluxHandle,
	useInputContext,
} = createFluxReact<
	typeof actions,
	keyof typeof contexts,
	FluxJecs<typeof actions, typeof contexts>
>();

interface StatusRowProps {
	readonly label: string;
	readonly value: string;
}

function StatusRow({ label, value }: StatusRowProps): React.ReactNode {
	return (
		<textlabel
			AutomaticSize={Enum.AutomaticSize.X}
			BackgroundTransparency={1}
			FontFace={Font.fromEnum(Enum.Font.RobotoMono)}
			Size={new UDim2(1, 0, 0, 20)}
			Text={`${label}: ${value}`}
			TextColor3={new Color3(1, 1, 1)}
			TextSize={14}
			TextXAlignment={Enum.TextXAlignment.Left}
		/>
	);
}

function JumpIndicator(): React.ReactNode {
	const isJumping = useAction((state) => state.pressed("jump"));

	return <StatusRow label="jump" value={isJumping ? "PRESSED" : "released"} />;
}

function MoveIndicator(): React.ReactNode {
	const direction = useAction((state) => state.direction2d("move"));

	return (
		<StatusRow
			label="move"
			value={`(${string.format("%.1f", direction.X)}, ${string.format("%.1f", direction.Y)})`}
		/>
	);
}

/**
 * Toggles the menu context through the wrapper, on the Provider's entity.
 *
 * `useFluxCore()` returns the `FluxJecs` wrapper here, so the toggle also
 * adds or removes the jecs `menu` tag. The tag row reads the world straight,
 * so it disagrees with the context row if the sync ever breaks.
 *
 * @returns The menu state row and the jecs tag row.
 */
function MenuToggle(): React.ReactNode {
	const source = useFluxCore();
	const entity = useFluxHandle();
	const didToggle = useAction((state) => state.justPressed("toggleMenu"));
	const isMenuActive = useActiveContext("menu");

	useEffect(() => {
		if (!didToggle) {
			return;
		}

		if (isMenuActive) {
			source.removeContext(entity, "menu");
		} else {
			source.addContext(entity, "menu");
		}
	}, [didToggle, isMenuActive, source, entity]);

	return (
		<>
			<StatusRow label="menu (press M)" value={isMenuActive ? "OPEN" : "closed"} />
			<StatusRow
				label="jecs menu tag"
				value={tostring(world.has(entity, flux.contexts.menu))}
			/>
		</>
	);
}

function ConfirmIndicator(): React.ReactNode {
	const isMenuActive = useActiveContext("menu");
	const isConfirming = useAction((state) => state.pressed("confirm"));

	if (!isMenuActive) {
		return <StatusRow label="confirm" value="(menu closed)" />;
	}

	return <StatusRow label="confirm" value={isConfirming ? "PRESSED" : "released"} />;
}

/**
 * Rebinds `jump` through the wrapper, on the Provider's entity.
 *
 * @returns The jump bindings row.
 */
function JumpRebind(): React.ReactNode {
	const source = useFluxCore();
	const entity = useFluxHandle();
	const didSwap = useAction((state) => state.justPressed("swapJump"));
	const jumpBindings = useBindings("jump");

	useEffect(() => {
		if (!didSwap) {
			return;
		}

		if (source.getBindingOrigin(entity, "jump", "keyboard", "gameplay") === "override") {
			source.resetBindings(entity, "jump");
		} else {
			source.rebind(entity, "jump", [Enum.KeyCode.J]);
		}
	}, [didSwap, source, entity]);

	return (
		<StatusRow
			label="jump bindings (press R)"
			value={jumpBindings.map((binding) => tostring(binding)).join(", ")}
		/>
	);
}

function MenuContextPanel(): React.ReactNode {
	const info = useInputContext("menu");

	return (
		<frame
			BackgroundColor3={new Color3(0.05, 0.05, 0.05)}
			BackgroundTransparency={0.2}
			BorderSizePixel={0}
			Size={new UDim2(1, 0, 0, 90)}
		>
			<uicorner CornerRadius={new UDim(0, 6)} />
			<uipadding PaddingLeft={new UDim(0, 8)} PaddingTop={new UDim(0, 6)} />
			<uilistlayout Padding={new UDim(0, 2)} SortOrder={Enum.SortOrder.LayoutOrder} />
			<textlabel
				BackgroundTransparency={1}
				FontFace={Font.fromEnum(Enum.Font.GothamBold)}
				Size={new UDim2(1, 0, 0, 18)}
				Text="[useInputContext('menu')]"
				TextColor3={new Color3(0.9, 0.7, 0.4)}
				TextSize={13}
				TextXAlignment={Enum.TextXAlignment.Left}
			/>
			<StatusRow label="isActive" value={tostring(info.isActive)} />
			<StatusRow label="priority" value={tostring(info.priority)} />
			<StatusRow label="sink" value={tostring(info.sink)} />
			<StatusRow label="actions" value={info.actions.join(", ")} />
		</frame>
	);
}

function App(): React.ReactNode {
	return (
		<screengui ResetOnSpawn={false}>
			<frame
				BackgroundColor3={new Color3(0.1, 0.1, 0.1)}
				BackgroundTransparency={0.3}
				BorderSizePixel={0}
				Position={new UDim2(0, 10, 0, 10)}
				Size={new UDim2(0, 320, 0, 300)}
			>
				<uicorner CornerRadius={new UDim(0, 8)} />
				<uipadding PaddingLeft={new UDim(0, 10)} PaddingTop={new UDim(0, 10)} />
				<uilistlayout Padding={new UDim(0, 4)} SortOrder={Enum.SortOrder.LayoutOrder} />
				<textlabel
					BackgroundTransparency={1}
					FontFace={Font.fromEnum(Enum.Font.GothamBold)}
					Size={new UDim2(1, 0, 0, 24)}
					Text="[Flux React + Jecs E2E]"
					TextColor3={new Color3(0.4, 0.8, 1)}
					TextSize={16}
					TextXAlignment={Enum.TextXAlignment.Left}
				/>
				<JumpIndicator />
				<MoveIndicator />
				<MenuToggle />
				<ConfirmIndicator />
				<JumpRebind />
				<MenuContextPanel />
			</frame>
		</screengui>
	);
}

const playerGui = player.FindFirstChildOfClass("PlayerGui");
assert(playerGui, "PlayerGui not found on LocalPlayer");

const root = ReactRoblox.createRoot(playerGui);

root.render(
	<FluxProvider core={flux} handle={playerEntity}>
		<App />
	</FluxProvider>,
);

RunService.Heartbeat.Connect((deltaTime) => {
	flux.update(deltaTime);
	flush();
});
