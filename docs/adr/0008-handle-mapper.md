# Integrations map handle keys through a HandleMapper declared in core

Core declares a type-only `HandleMapper<T, Contexts, K>` contract —
`{ core, toHandle(key: K): InputHandle }` — and each integration that keys
consumers by its own identifier (flux-jecs keys them by `Entity`) satisfies it.
flux-react is generic over the source type: `createFluxReact<S>()` takes either
a `FluxCore` or a `HandleMapper` and derives the action map and context names
from it. The Provider and the explicit-handle hook overloads accept handle keys
and map them internally. Integration consumers never write a cast or call a
mapping helper, and flux-react never imports an integration package.

The contract lives in core rather than flux-react so an integration can declare
`extends HandleMapper` and have the compiler hold the two packages to the same
shape; a structural match with no shared declaration would break silently on a
rename.

`createFluxReact` takes the source type as its single type argument, which broke
the earlier `createFluxReact<Actions, Contexts>()` form. Core-only consumers now
write `createFluxReact<FluxCore<Actions, Contexts>>()`. One type argument means
each type is written once; keeping both forms through overloads was rejected
because a one-argument call is ambiguous between them.

## Considered options

- **A per-integration React package** (`flux-jecs-react`): a second package to
  publish and keep in step with flux-react for every hook change.
- **Loosening the `InputHandle` brand** so a jecs `Entity` is assignable: core
  would encode the jecs brand, and any jecs id — a `Tag`, a component — would
  pass as a handle.
- **Passing the integration instance to `createFluxReact`**: the factory would
  own an instance, breaking the shared-module pattern where the core arrives at
  render time through the Provider.
