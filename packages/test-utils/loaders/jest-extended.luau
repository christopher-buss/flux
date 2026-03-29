-- Compiled with @isentinel/roblox-ts v3.1.3
local TS = require(game:GetService("ReplicatedStorage"):WaitForChild("rbxts_include"):WaitForChild("RuntimeLib"))
local matchers = TS.import(
	script,
	game:GetService("ReplicatedStorage"),
	"rbxts_include",
	"node_modules",
	"@rbxts",
	"jest-extended",
	"dist"
)
local expect = TS.import(
	script,
	game:GetService("ReplicatedStorage"),
	"rbxts_include",
	"node_modules",
	"@rbxts",
	"jest-globals",
	"src"
).expect
expect.extend(matchers)
return nil
