#!/usr/bin/env bash
set -euo pipefail

# Parse hook input
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

# Exit early if no file path
[[ -z "$file_path" ]] && exit 0

# Only process TypeScript files
[[ "$file_path" =~ \.(ts|tsx)$ ]] || exit 0

# Cache file at project root
cache_file=".tsconfig-cache.txt"

# Check if tsconfig.json has changed using SHA256 hash
if [[ -f "tsconfig.json" ]]; then
	current_hash=$(sha256sum tsconfig.json 2>/dev/null | cut -d' ' -f1 || echo "")
	cached_hash=$(cat "$cache_file" 2>/dev/null || echo "")

	# Update cache if hash changed
	if [[ "$current_hash" != "$cached_hash" ]] && [[ -n "$current_hash" ]]; then
		echo "$current_hash" > "$cache_file"
	fi
fi

# Run TypeScript type check on whole project (uses tsconfig.json automatically)
tsc_output=$(pnpm exec tsgo --noEmit --pretty false 2>&1 || true)

# Check if TypeScript found any errors
if echo "$tsc_output" | grep -qi "error TS"; then
	# Extract error lines (first 10 to avoid context bloat)
	errors=$(echo "$tsc_output" | grep -i "error TS" | head -10)

	# Count total errors
	error_count=$(echo "$tsc_output" | grep -ci "error TS" || echo "0")

	# Output minimal JSON context for Claude
	jq -n \
		--arg errors "$errors" \
		--arg count "$error_count" \
		'{
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: ("⚠️ TypeScript found " + $count + " type error(s):\n" + $errors)
			}
		}'
	exit 0
fi

# Silent success - no type errors
exit 0