import { createFluxJecs } from "@rbxts/flux-jecs";
import Jecs from "@rbxts/jecs";
import { Players } from "@rbxts/services";

import { actions } from "shared/actions";
import { contexts } from "shared/contexts";

const world = Jecs.world();
const flux = createFluxJecs(world, { actions, contexts });

// eslint-disable-next-line flawless/naming-convention -- Jecs component convention
const Player = world.component();

Players.PlayerAdded.Connect((player) => {
	const entity = world.entity();
	world.add(entity, Player);
	flux.register(entity, player, "gameplay");
});
