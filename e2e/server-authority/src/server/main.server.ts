import { createCore } from "@flux/core";
import { Players, RunService } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const core = createCore({ actions, contexts });
const playerHandles = new Map<Player, ReturnType<typeof core.register>>();

Players.PlayerAdded.Connect((player) => {
	const handle = core.register(player, "gameplay");
	playerHandles.set(player, handle);
});

Players.PlayerRemoving.Connect((player) => {
	const handle = playerHandles.get(player);
	if (handle !== undefined) {
		core.unregister(handle);
		playerHandles.delete(player);
	}
});

// Server authority: IAS replicates input natively, server reads state directly
RunService.Heartbeat.Connect((deltaTime) => {
	core.update(deltaTime);

	for (const [player, handle] of playerHandles) {
		const state = core.getState(handle);
		const move = state.direction2d("move");
		const isJumping = state.pressed("jump");

		if (isJumping || move.Magnitude > 0) {
			print(
				`[Server] ${player.Name} — jump: ${isJumping}, move: (${string.format("%.1f", move.X)}, ${string.format("%.1f", move.Y)})`,
			);
		}
	}
});
