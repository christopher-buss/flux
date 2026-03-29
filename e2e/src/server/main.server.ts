import { createCore } from "@flux/core";
import { Players } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const core = createCore({ actions, contexts });

Players.PlayerAdded.Connect((player) => {
	core.register(player, "gameplay");
});
