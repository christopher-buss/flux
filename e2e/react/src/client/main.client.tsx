import { createCore } from "@flux/core";
import { createFluxReact } from "@flux/react";
import React, { useEffect } from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const player = Players.LocalPlayer;
const core = createCore({ actions, contexts });
const [handle] = core.subscribe(player, "gameplay");

const { flush, FluxProvider, useAction, useActiveContext, useFluxCore, useInputContext } =
	createFluxReact<typeof actions, keyof typeof contexts>();

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

function App(): React.ReactNode {
	return (
		<screengui ResetOnSpawn={false}>
			<frame
				BackgroundColor3={new Color3(0.1, 0.1, 0.1)}
				BackgroundTransparency={0.3}
				BorderSizePixel={0}
				Position={new UDim2(0, 10, 0, 10)}
				Size={new UDim2(0, 300, 0, 270)}
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
			</frame>
		</screengui>
	);
}

// eslint-disable-next-line ts/no-non-null-assertion -- Exists
const root = ReactRoblox.createRoot(player.FindFirstChildOfClass("PlayerGui")!);

root.render(
	<FluxProvider core={core} handle={handle}>
		<App />
	</FluxProvider>,
);

RunService.Heartbeat.Connect((deltaTime) => {
	core.update(deltaTime);
	flush();
});
