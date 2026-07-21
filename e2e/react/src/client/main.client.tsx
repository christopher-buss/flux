import { createCore } from "@flux/core";
import { createFluxReact } from "@flux/react";
import React, { useEffect } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

import { createPlatformOverrideCycle, mountPlatformReadout } from "./platform-readout";

const player = Players.LocalPlayer;
const core = createCore({ actions, contexts });
const [handle] = core.subscribe(player, "gameplay");

const {
	flush,
	FluxProvider,
	useAction,
	useActiveContext,
	useBindings,
	useFluxCore,
	useInputContext,
	useInputPlatform,
} = createFluxReact<typeof actions, keyof typeof contexts>();

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

function FireIndicator(): React.ReactNode {
	const isFiring = useAction((state) => state.pressed("fire"));

	return <StatusRow label="fire" value={isFiring ? "PRESSED" : "released"} />;
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

function MenuToggle(): React.ReactNode {
	const fluxCore = useFluxCore();
	const didToggle = useAction((state) => state.justPressed("toggleMenu"));
	const isMenuActive = useActiveContext("menu");

	useEffect(() => {
		if (!didToggle) {
			return;
		}

		if (isMenuActive) {
			fluxCore.removeContext(handle, "menu");
		} else {
			fluxCore.addContext(handle, "menu");
		}
	}, [didToggle, isMenuActive, fluxCore]);

	return <StatusRow label="menu (press M)" value={isMenuActive ? "OPEN" : "closed"} />;
}

function ConfirmIndicator(): React.ReactNode {
	const isMenuActive = useActiveContext("menu");
	const isConfirming = useAction((state) => state.pressed("confirm"));

	if (!isMenuActive) {
		return <StatusRow label="confirm" value="(menu closed)" />;
	}

	return <StatusRow label="confirm" value={isConfirming ? "PRESSED" : "released"} />;
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

function PlatformPanel(): React.ReactNode {
	const platform = useInputPlatform();
	const jumpBindings = useBindings("jump", platform);

	return (
		<frame
			BackgroundColor3={new Color3(0.05, 0.05, 0.05)}
			BackgroundTransparency={0.2}
			BorderSizePixel={0}
			Size={new UDim2(1, 0, 0, 66)}
		>
			<uicorner CornerRadius={new UDim(0, 6)} />
			<uipadding PaddingLeft={new UDim(0, 8)} PaddingTop={new UDim(0, 6)} />
			<uilistlayout Padding={new UDim(0, 2)} SortOrder={Enum.SortOrder.LayoutOrder} />
			<textlabel
				BackgroundTransparency={1}
				FontFace={Font.fromEnum(Enum.Font.GothamBold)}
				Size={new UDim2(1, 0, 0, 18)}
				Text="[useInputPlatform()]"
				TextColor3={new Color3(0.9, 0.7, 0.4)}
				TextSize={13}
				TextXAlignment={Enum.TextXAlignment.Left}
			/>
			<StatusRow label="platform" value={platform} />
			<StatusRow
				label="jump bindings"
				value={jumpBindings.map((binding) => tostring(binding)).join(", ")}
			/>
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
				Size={new UDim2(0, 300, 0, 345)}
			>
				<uicorner CornerRadius={new UDim(0, 8)} />
				<uipadding PaddingLeft={new UDim(0, 10)} PaddingTop={new UDim(0, 10)} />
				<uilistlayout Padding={new UDim(0, 4)} SortOrder={Enum.SortOrder.LayoutOrder} />
				<textlabel
					BackgroundTransparency={1}
					FontFace={Font.fromEnum(Enum.Font.GothamBold)}
					Size={new UDim2(1, 0, 0, 24)}
					Text="[Flux React E2E]"
					TextColor3={new Color3(0.4, 0.8, 1)}
					TextSize={16}
					TextXAlignment={Enum.TextXAlignment.Left}
				/>
				<JumpIndicator />
				<FireIndicator />
				<MoveIndicator />
				<MenuToggle />
				<ConfirmIndicator />
				<MenuContextPanel />
				<PlatformPanel />
			</frame>
		</screengui>
	);
}

const playerGui = player.FindFirstChildOfClass("PlayerGui");
assert(playerGui, "PlayerGui not found on LocalPlayer");

const root = ReactRoblox.createRoot(playerGui);

root.render(
	<FluxProvider core={core} handle={handle}>
		<App />
	</FluxProvider>,
);

mountPlatformReadout(playerGui);

const state = core.getState(handle);
const cyclePlatformOverride = createPlatformOverrideCycle();

RunService.Heartbeat.Connect((deltaTime) => {
	core.update(deltaTime);

	// Read and cycled outside React, so the panel and the no-react readout are
	// both downstream of a caller that never saw a component.
	if (state.justPressed("cycleOverride")) {
		cyclePlatformOverride();
	}

	flush();
});
