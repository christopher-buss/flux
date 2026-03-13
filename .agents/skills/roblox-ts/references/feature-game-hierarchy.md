---
name: feature-game-hierarchy
description: |
    Use when typing game hierarchy (Workspace children, services) in roblox-ts
---

# Typing Game Hierarchy

TypeScript doesn't know your game structure, so you can't index children
directly:

```ts
import { Workspace } from "@rbxts/services";

// ❌ ERROR: Property 'Zombie' does not exist on type 'Workspace'
print(Workspace.Zombie);
```

## Ambient Type Declarations

Create `src/services.d.ts` (no imports/exports = ambient):

```ts
// src/services.d.ts
interface Workspace extends Instance {
	Zombie: Model;
}
```

Now it works:

```ts
import { Workspace } from "@rbxts/services";

print(Workspace.Zombie); // ✅ Typed as Model
```

## Nested Children

Use intersection types for nested structure:

```ts
interface Workspace extends Instance {
	Zombie: Model & {
		Head: Part & {
			Face: Decal;
		};
		Humanoid: Humanoid;
		HumanoidRootPart: Part;
	};
}
```

```ts
print(Workspace.Zombie.Humanoid.Health);
print(Workspace.Zombie.Head.Face.Texture);
```

## ReplicatedStorage Assets

```ts
interface ReplicatedStorage extends Instance {
	Assets: Folder & {
		Effects: Folder;
		Weapons: Folder & {
			Bow: Tool;
			Sword: Tool;
		};
	};
	Remotes: Folder & {
		GetData: RemoteFunction;
		OnDamage: RemoteEvent;
	};
}
```

<!--
Source references:
- https://roblox-ts.com/docs/guides/indexing-children
-->
