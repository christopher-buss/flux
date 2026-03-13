# Good and Bad Tests

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```typescript
// GOOD: Tests observable behavior
describe("a player", () => {
	it("should die when health reaches zero", () => {
		expect.assertions(1);

		const player = createPlayer({ health: 50 });
		applyDamage(player, 50);

		expect(player.isDead()).toBe(true);
	});
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```typescript
// BAD: Tests implementation details
it("should call healthComponent.subtract", () => {
	expect.assertions(1);

	const player = createPlayer({ health: 50 });
	const mockHealth = jest.fn();
	applyDamage(player, 50);

	expect(mockHealth.subtract).toHaveBeenCalledWith(50);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of interface

```typescript
// BAD: Bypasses interface to verify
it("should add to inventory", () => {
	expect.assertions(1);

	const player = createPlayer({ health: 50 });
	equipItem(player, "sword");
	const slot = player.backpack.FindFirstChild("Sword");

	expect(slot).toBeDefined();
});

// GOOD: Verifies through interface
it("should make equipped item retrievable", () => {
	expect.assertions(1);

	const player = createPlayer({ health: 50 });
	equipItem(player, "sword");
	const equipped = getEquippedWeapon(player);

	expect(equipped).toBe("sword");
});
```
