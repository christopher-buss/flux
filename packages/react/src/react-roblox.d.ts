export {};

declare module "@rbxts/react-roblox" {
	/**
	 * - Renders the updates `callback` schedules synchronously, before
	 *   returning.
	 * - Exported by react-roblox's Lua (`ReactRoblox.lua:230`) but absent from
	 *   its shipped typings, so it is declared here.
	 *
	 * Any render already in flight is discarded and restarted, which is what
	 * lets a store change reach every consumer in one commit.
	 *
	 * @template T - The callback's return type.
	 * @param callback - Runs immediately; its updates render at sync lane.
	 * @returns Whatever `callback` returned.
	 * @remarks
	 * If called from render or a lifecycle method, it logs a dev error and just
	 * runs `callback`, flushing nothing.
	 */
	function flushSync<T>(callback: () => T): T;
}
