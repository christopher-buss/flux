## TSDoc Policy

Use TSDoc for all public API documentation. Follow the structure below for
cosistency and clarity. Include examples liberally.

Structure:

1. Summary (one sentence)
2. Detail paragraph (complex logic only)
3. Tags: @param, @returns, @example, @remarks, @throws, @template

Example:

```typescript
/**
 * - Manages boolean toggle state.
 * - @param initialState - Initial value.
 * - @returns Object with `state` and `toggle()` updater.
 */
```