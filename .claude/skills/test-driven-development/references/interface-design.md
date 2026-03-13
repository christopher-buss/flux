# Interface Design for Testability

Good interfaces make testing natural:

1. **Accept dependencies, don't create them**

```typescript
// Testable
function applyDamage(target: Entity, damageCalculator: DamageCalculator): void {
	const damage = damageCalculator.calculate(target);
	target.health -= damage;
}

// Hard to test
function applyDamage(target: Entity): void {
	const calculator = new DefaultDamageCalculator();
}
```

2. **Return results, don't produce side effects**
 
```typescript
// Testable
function calculateLoot(enemy: Enemy, dropTable: DropTable): Array<Item> {
	return dropTable.getDrops(enemy);
}

// Hard to test
function grantLoot(enemy: Enemy): void {
	player.inventory.add(randomDrop());
}
```

3. **Small surface area**
   - Fewer methods = fewer tests needed
   - Fewer params = simpler test setup
