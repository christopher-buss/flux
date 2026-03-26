for (const [key] of pairs(_G)) {
	if (typeIs(key, "Instance") && key.IsA("ModuleScript")) {
		delete (_G as unknown as Record<string, unknown>)[key as unknown as string];
	}
}
