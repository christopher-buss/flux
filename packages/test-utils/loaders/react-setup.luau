--[[
	Enables react-lua's mock scheduler, which `ReactRoblox.act` and the
	`unstable_flush*` yield helpers both require.

	Writing `_G` does not work. `ReactGlobals` snapshots `_G` once, at its own
	module load, and that load happens before jest-roblox runs setup files, so
	the write lands too late and every consumer reads `false`. Setting the field
	on the module is what ReactGlobals' own documentation prescribes.
]]
local nodeModules = game:GetService("ReplicatedStorage").rbxts_include.node_modules
local ReactGlobals = require(nodeModules["@rbxts-js"].ReactGlobals)

ReactGlobals.__ROACT_17_MOCK_SCHEDULER__ = true

return nil
