import { createCore } from "@flux/core";
import { createFluxReact } from "@flux/react";
import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const player = Players.LocalPlayer;
const core = createCore({ actions, contexts });
const [handle] = core.subscribe(player, "gameplay");

const { flush, FluxProvider, useAction } = createFluxReact({ core });

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

function App(): React.ReactNode {
	return (
		<screengui ResetOnSpawn={false}>
			<frame
				BackgroundColor3={new Color3(0.1, 0.1, 0.1)}
				BackgroundTransparency={0.3}
				BorderSizePixel={0}
				Position={new UDim2(0, 10, 0, 10)}
				Size={new UDim2(0, 250, 0, 130)}
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
			</frame>
		</screengui>
	);
}

// eslint-disable-next-line ts/no-non-null-assertion -- Exists
const root = ReactRoblox.createRoot(player.FindFirstChildOfClass("PlayerGui")!);

root.render(
	<FluxProvider handle={handle}>
		<App />
	</FluxProvider>,
);

RunService.Heartbeat.Connect((deltaTime) => {
	core.update(deltaTime);
	flush();
});
