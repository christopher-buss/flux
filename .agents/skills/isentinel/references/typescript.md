---
name: typescript
description: Use when configuring TypeScript or extending @isentinel/tsconfig
metadata:
    author: Christopher Buss
    version: "2026.1.29"
---

# TypeScript Configuration

## Base Config

Extend `@isentinel/tsconfig` for roblox-ts projects:

```json
{
	"extends": "@isentinel/tsconfig/configs/roblox/tsconfig.json"
}
```

## Strict Settings

The config enables strict mode plus additional checks:

| Option                               | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `strict`                             | All base strict checks                                 |
| `exactOptionalPropertyTypes`         | Optional properties don't implicitly include undefined |
| `noUncheckedIndexedAccess`           | Index signatures return `T \| undefined`               |
| `noPropertyAccessFromIndexSignature` | Require bracket notation for index signatures          |
| `noImplicitOverride`                 | Require `override` keyword                             |
| `noImplicitReturns`                  | All code paths must return                             |
| `noFallthroughCasesInSwitch`         | No fallthrough in switch                               |

## roblox-ts Specifics

The config includes roblox-ts requirements:

- `noLib: true` - No default lib (roblox-ts provides its own)
- `typeRoots: ["node_modules/@rbxts"]` - Only @rbxts types
- `jsx: "react"` - For @rbxts/react
- `moduleResolution: "node"` - Required by roblox-ts
