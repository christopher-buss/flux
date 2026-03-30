---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production
code must be written in response to a failing test. No exceptions. This is not a
suggestion or a preference - it is the fundamental practice that enables all
other sofware development principles.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven
testing and functional programming principles. All work should be done in small,
incremental changes that maintain a working state throughout development.

Load the `test-driven-development` and `jest` skill for all testing-related work.

# Testing Rules

Test behavior, not implementation.

- Write tests first (TDD non-negotiable)
- Test through public API exclusively
- Use factory functions for test data (no `let`/`beforeEach`)
- Tests must document expected behaviors
- No 1:1 mapping between test files and implementation files
- Code coverage must be 100% - no untested code allowed

Place tests in `<file-name>.spec.ts` files next to the implementation file.
Example: `src/shared/modules/foo/bar.ts` → `src/shared/modules/foo/bar.spec.ts`

All public API must also have `.spec-d.ts` type tests verifying compile-time
constraints (rejected arguments, inferred return types) using `expectTypeOf`
from `@rbxts/jest-utils/type-testing`.

Integration tests that span multiple modules should be placed in a `tests/`
directory at the root of each package. End-to-end tests that span the entire
system should be placed in the `e2e/` directory at the root of the repository.

Pattern:

```typescript
import { describe, expect, it } from "@rbxts/jest-globals";

import { myFunction } from "./bar";

describe(myFunction, () => {
	it("should handle operations", () => {
		expect.assertions(1);

		expect(myFunction()).toBe(10);
	});
});
```