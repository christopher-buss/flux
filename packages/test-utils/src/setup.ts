for (const [key] of pairs(_G)) {
	if (typeIs(key, "Instance") && key.IsA("ModuleScript")) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- _G is keyed by ModuleScript instances here; that index shape is not expressible in the type system
		delete (_G as unknown as Record<string, unknown>)[key as unknown as string];
	}
}
