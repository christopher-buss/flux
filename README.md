<h3 align="center">
    <br />
    Flux
</h3>

<p align="center">
    Input Action System for Roblox
</p>

<p align="center">
    <a href="https://github.com/christopher-buss/flux/blob/main/LICENSE"><img src="https://img.shields.io/github/license/christopher-buss/flux" alt="License" /></a>
</p>

---

Flux is a wrapper around Roblox's Input Action system. You can define actions
with typed values, bind them to physical inputs through contexts, and optionally
attach triggers and modifiers to control when and how they fire.

## Quick Start

```ts
import {
	bool,
	createCore,
	deadZone,
	defineActions,
	defineContexts,
	direction2d,
	hold,
	implicit,
	position2d,
} from "@rbxts/flux";

const actions = defineActions({
	aim: position2d(),
	heavyAttack: bool({
		triggers: [implicit(hold({ attempting: 0.2, oneShot: true, threshold: 0.5 }))],
	}),
	jump: bool(),
	move: direction2d({ modifiers: [deadZone(0.1)] }),
});

const contexts = defineContexts({
	gameplay: {
		bindings: {
			aim: [Enum.UserInputType.MouseMovement, Enum.UserInputType.Touch],
			heavyAttack: [Enum.KeyCode.F, Enum.KeyCode.ButtonR2],
			jump: [Enum.KeyCode.Space, Enum.KeyCode.ButtonA],
			move: [
				Enum.KeyCode.W,
				Enum.KeyCode.A,
				Enum.KeyCode.S,
				Enum.KeyCode.D,
				Enum.KeyCode.Thumbstick1,
			],
		},
		priority: 0,
	},
});

const core = createCore({ actions, contexts });
const handle = core.register(Players.LocalPlayer, "gameplay");

function update(deltaTime: number): void {
	core.update(deltaTime);
	const state = core.getState(handle);

	if (state.justPressed("jump")) {
		// handle jump
	}

	const move = state.direction2d("move"); // Vector2
	const aim = state.position2d("aim"); // Vector2
}
```

<details>
<summary>Luau</summary>

```luau
local Flux = require(path.to.flux)

local actions = Flux.defineActions({
	aim = Flux.position2d(),
	heavyAttack = Flux.bool({
		triggers = { Flux.implicit(Flux.hold({ attempting = 0.2, oneShot = true, threshold = 0.5 })) },
	}),
	jump = Flux.bool(),
	move = Flux.direction2d({ modifiers = { Flux.deadZone(0.1) } }),
})

local contexts = Flux.defineContexts({
	gameplay = {
		bindings = {
			aim = { Enum.UserInputType.MouseMovement, Enum.UserInputType.Touch },
			heavyAttack = { Enum.KeyCode.F, Enum.KeyCode.ButtonR2 },
			jump = { Enum.KeyCode.Space, Enum.KeyCode.ButtonA },
			move = { Enum.KeyCode.W, Enum.KeyCode.A, Enum.KeyCode.S, Enum.KeyCode.D, Enum.KeyCode.Thumbstick1 },
		},
		priority = 0,
	},
})

local core = Flux.createCore({ actions = actions, contexts = contexts })
local handle = core.register(Players.LocalPlayer, "gameplay")

local function update(deltaTime: number)
	core:update(deltaTime)
	local state = core:getState(handle)

	if state:justPressed("jump") then
		-- handle jump
	end

	local move = state:direction2d("move") -- Vector2
	local aim = state:position2d("aim") -- Vector2
end
```

</details>

## Installation

Flux is in active development and not yet published to npm or Wally. You can try
it by cloning the repo.

## Packages

| Package                       | Description                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------- |
| [flux](packages/core)         | Core input system — actions, contexts, triggers, modifiers                        |
| [flux-jecs](packages/jecs)    | JECS integration — maps entities to input handles. Requires `flux` as a dependency |

The core has no framework dependencies. Integration packages like flux-jecs
connect it to whatever you're using.

## Documentation

Docs are in progress. These cover the current design:

- [Core API Proposal](docs/core-api-proposal.md) — API design and usage patterns
- [PRD](docs/PRD-flux-core.md) — Requirements and user stories

## Contributing

Flux is early. If you run into issues or have ideas, open an issue or start a
discussion.

## License

[MIT](LICENSE)
