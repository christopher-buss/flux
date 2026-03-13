# When to Mock

Mock at **system boundaries** only:

- External services
- Remote events/functions (client-server boundary)
- Time/randomness
- Player input

Don't mock:

- Your own modules
- Internal collaborators
- Anything you control

## Designing for Mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock — pass the HTTP client in
function fetchLeaderboard(httpClient: HttpClient): Array<LeaderboardEntry> {
	return httpClient.get("https://api.example.com/leaderboard");
}

// Hard to mock — creates its own client internally
function fetchLeaderboard(): Array<LeaderboardEntry> {
	const client = new HttpClient({ apiKey: CONFIG.API_KEY, retries: 3 });
	return client.get("https://api.example.com/leaderboard");
}
```

**2. Prefer specific interfaces over generic ones**

Create specific functions for each external operation instead of one generic
function with conditional logic:

```typescript
// GOOD: Each function is independently mockable
const playerData = {
	load: (userId: number) => dataStore.GetAsync(tostring(userId)),
	remove: (userId: number) => dataStore.RemoveAsync(tostring(userId)),
	save: (userId: number, data: PlayerData) => dataStore.SetAsync(tostring(userId), data),
};

// BAD: Mocking requires conditional logic inside the mock
const playerData = {
	request: (operation: string, userId: number, data?: PlayerData) => {
		/* ... */
	},
};
```

The specific approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which operations a test exercises
- Type safety per operation
