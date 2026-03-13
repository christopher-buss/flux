---
name: feature-luau-interop
description: |
    Use when calling existing Luau code from roblox-ts or typing Luau modules
---

# Luau Interop

## LuaTuple for Multiple Returns

TypeScript tuples create arrays. Use `LuaTuple<T>` only when calling Luau code
that expects actual multiple returns:

```ts
// ✅ PREFERRED: TypeScript tuple for TS-to-TS code
function getValues(): [number, string] {
	return [42, "hello"]; // Compiles to: return {42, "hello"}
}

// ✅ FOR LUAU INTEROP: When Luau expects multiple returns
function luauStyleReturns(): LuaTuple<[number, string]> {
	return $tuple(42, "hello"); // Compiles to: return 42, "hello"
}
```

Roblox APIs use multiple returns, so destructure directly:

```ts
// pcall returns LuaTuple
const [success, result] = pcall(() => doSomething());

// DataStore GetAsync returns LuaTuple
const dataStore = DataStoreService.GetDataStore("ExampleDataStore");
const [value, DataStoreKeyInfo] = dataStore.GetAsync("ExampleKey");
```

## The $tuple Macro

Use `$tuple()` to create actual Lua multiple returns:

```ts
// ❌ SYNTAX ERROR - can't return comma-separated values
function broken(): LuaTuple<[number, string]> {
	return (42, "hello");
}

// Practical example: wrapping pcall
function safeDivide(a: number, b: number): LuaTuple<[boolean, number]> {
	if (b === 0) {
		return $tuple(false, 0);
	}

	return $tuple(true, a / b);
}

// ✅ Use $tuple macro
function works(): LuaTuple<[number, string]> {
	return $tuple(42, "hello"); // Compiles to: return 42, "hello"
}

const [ok, result] = safeDivide(10, 2);
```

## Type Declaration Files

To use existing Luau modules, create a `.d.ts` file next to the `.luau` file:

```text
src/
  MyModule.luau
  MyModule.d.ts   # Types for MyModule
```

**Exception for init.luau:** Pair with `index.d.ts`, not `init.d.ts`:

```text
src/
  MyFolder/
    init.luau      # Luau module
    index.d.ts    # ✅ Correct pairing
    init.d.ts     # ❌ Won't work
```

**Module returning a table:**

```luau
-- MyModule.luau
local MyModule = {}
MyModule.value = 42

function MyModule.doThing(x)
	return tostring(x)
end

return MyModule
```

```ts
// MyModule.d.ts
interface MyModule {
	doThing(x: number): string;
	value: number;
}

declare const MyModule: MyModule;
export = MyModule;
```

**Module with exports:**

```luau
-- MyConstants.luau
return {
	Foo = "hello",
	Bar = 123,
}
```

```ts
// MyConstants.d.ts
export declare const Foo: string;
export declare const Bar: number;
```

**Custom OOP class:**

```luau
-- MyClass.luau
local MyClass = {}
MyClass.__index = MyClass

function MyClass.new()
	local self = setmetatable({}, MyClass)
	self.value = 0
	return self
end

function MyClass.staticMethod()
	print("static method")
end

function MyClass:getValue()
	return self.value
end

return MyClass
```

```ts
// MyClass.d.ts
interface MyClass {
	getValue(): number;
	value: number;
}

interface MyClassConstructor {
	new (): MyClass;
	staticMethod(): void;
}

declare const MyClass: MyClassConstructor;
export = MyClass;
```

Usage:

```ts
import MyClass from "./MyClass";

const instance = new MyClass();
print(instance.getValue());
```

## Callbacks vs Methods

roblox-ts decides `.` vs `:` based on function declaration style:

```ts
const object = {
	// Arrow function → callback (uses .)
	callback: () => print("dot syntax"),

	// Method declaration → method (uses :)
	method() {
		print("colon syntax", this);
	},
};

object.callback(); // Compiles to: obj.callback()
object.method(); // Compiles to: obj:method()
```

Override with explicit `this` parameter:

```ts
const object = {
	// Force callback even with method syntax
	forceCallback(this: void) {
		print("uses dot");
	},

	// Force method even with arrow
	forceMethod(this: typeof object) {
		print("uses colon");
	},
};
```

<!--
Source references:
- https://roblox-ts.com/docs/guides/lua-tuple
- https://roblox-ts.com/docs/guides/using-existing-luau
- https://roblox-ts.com/docs/guides/callbacks-vs-methods
-->
