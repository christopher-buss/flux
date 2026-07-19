# PROTOTYPE — useCapture hook shape (throwaway)

Wayfinder ticket [#158](https://github.com/christopher-buss/flux/issues/158).
**Delete me** — nothing here ships. The capture core is a stub of the decisions
in #153–#156, not the real implementation.

## Question

What does `useCapture` look like to a component author? Arguments, return value,
how the token reaches dispatch code, per-widget vs per-session usage — plus the
lifecycle work the hook owns per #153: re-render dedup, StrictMode double-mount,
condition-driven capture, unmount release, out-of-order unmounts.

## Candidate shape under test

```ts
const confirm = useCapture("confirm", {
	debugLabel: "PurchaseModal",
	enabled: props.interactive, // omit = capture while mounted
});
// confirm: CaptureToken | undefined — undefined until captured / while disabled
if (confirm?.justPressed()) {
	buy();
}
```

- Captures in `useEffect([action, enabled])`, releases in cleanup.
- Token lands via `useState` → reaches dispatch code as a plain value.
- Re-renders don't re-capture (deps); StrictMode double-mount = capture,
  release, capture — safe because release is idempotent and the stack is LIFO.

## Run

```sh
pnpm proto:use-capture
```

Drive it: mount the modal over gameplay, nest the toast, hold `confirm` across
mounts/unmounts, watch the stack and what each reader sees.

## Things to react to

1. **Token-as-value vs always-returned reader**: `undefined` until the effect
   lands means one extra render and one uncaptured frame after mount. Is the
   `?.` everywhere acceptable, or should the hook return a never-undefined
   reader that reads inert until capture lands?
2. **`enabled` option vs conditional mounting**: is condition-driven capture a
   real need, or is "mount the widget = capture" enough?
3. **Dispatch path**: reading the token inside a per-frame effect/loop — does
   the shape fit how Roblox React code actually dispatches?
