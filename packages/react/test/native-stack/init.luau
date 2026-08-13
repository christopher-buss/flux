--!nolint
-- Loads the patched react-lua stack mounted at `rbxts_include.native_store_hook`
-- beside the stock one, so a single test run can drive both.
--
-- Nothing here is reachable from a normal import: `TS.getModule` resolves by
-- position, walking up from the requiring script to the first `node_modules`
-- holding the scope. The compiled `flux-react` under that subtree therefore
-- binds to the patched React with no second compilation, and the same files
-- mounted in the main tree keep binding to the stock one.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local include = ReplicatedStorage.rbxts_include
local nodeModules = include.native_store_hook.node_modules
local rbxts = nodeModules["@rbxts"]
local rbxtsJs = nodeModules["@rbxts-js"]

-- This subtree carries its own ReactGlobals instance, so the flag that
-- `@flux/test-utils/loaders/react-setup` sets for the main stack has to be set
-- again here, before anything requires the native Scheduler. Without it
-- `ReactRoblox.act` is an error stub.
local ReactGlobals = require(rbxtsJs.ReactGlobals)
ReactGlobals.__ROACT_17_MOCK_SCHEDULER__ = true

local TS = require(include.RuntimeLib)

return {
	FluxReact = TS.import(script, rbxts, "flux-react"),
	React = require(rbxts.react),
	ReactRoblox = require(rbxts["react-roblox"]),
	StoreHook = TS.import(script, rbxts["flux-react"], "use-sync-external-store"),
}
