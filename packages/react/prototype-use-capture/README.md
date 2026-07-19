# PROTOTYPE — useCapture hook shape (throwaway)

Wayfinder ticket [#158](https://github.com/christopher-buss/flux/issues/158).
**Delete me** — nothing here ships. The capture core is a stub of the decisions
in #153–#156, not the real implementation.

## Question

What does `useCapture` look like to a component author? Arguments, return value,
how the token reaches dispatch code, per-widget vs per-session usage — plus the
lifecycle work the hook owns per #153: re-render dedup, StrictMode double-mount,
condition-driven capture, unmount release, out-of-order unmounts.

## Candidate shape under test (B: stable inert-until-captured reader)

```ts
const confirm = useCapture("confirm", {
	debugLabel: "PurchaseModal",
	enabled: props.interactive, // omit = capture while mounted
});
// confirm: CaptureToken — stable identity; reads inert until the capture
// lands, while disabled, when shadowed, and after release. One rule, no `?.`.
if (confirm.justPressed()) {
	buy();
}
```

- Captures in `useEffect([action, enabled])`, releases in cleanup.
- Reader delivered via `useRef` → stable identity, no extra render.
- Re-renders don't re-capture (deps); StrictMode double-mount = capture,
  release, capture — safe because release is idempotent and the stack is LIFO.
- Shape A (`CaptureToken | undefined` via `useState`) was rejected: `undefined`
  duplicates the inert state shadowing already forces, costs a render, and leaks
  the `isCaptured` introspection #157 declined to expose.
- In real flux-react the `flux` argument disappears — core/handle come from
  `FluxProvider` context, `useAction`-style.

## Run

```sh
pnpm proto:use-capture
```

Drive it: mount the modal over gameplay, nest the toast, hold `confirm` across
mounts/unmounts, watch the stack and what each reader sees.

## Things to react to

1. ~~Token-as-value vs always-returned reader~~ — settled: shape B, stable
   reader, inert until captured.
2. **`enabled` option vs conditional mounting**: is condition-driven capture a
   real need, or is "mount the widget = capture" enough?
3. **Dispatch path**: reading the token inside a per-frame effect/loop — does
   the shape fit how Roblox React code actually dispatches?
