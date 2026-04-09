import { createCore } from "@flux/core";
import { Players } from "@rbxts/services";

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
