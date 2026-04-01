import { createFluxJecs } from "@rbxts/flux-jecs";
import Jecs from "@rbxts/jecs";
import { Players } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const world = Jecs.world();
const flux = createFluxJecs(world, { actions, contexts });
const entityByPlayer = new Map<Player, ReturnType<typeof world.entity>>();

// eslint-disable-next-line flawless/naming-convention -- Jecs component convention
const User = world.component();

Players.PlayerAdded.Connect((player) => {
	const entity = world.entity();
	entityByPlayer.set(player, entity);
	world.add(entity, User);
	flux.register(entity, player, "gameplay");
});

Players.PlayerRemoving.Connect((player) => {
	const entity = entityByPlayer.get(player);
	if (entity !== undefined) {
		world.delete(entity);
		entityByPlayer.delete(player);
	}
});
