#!/usr/bin/env bash
set -euo pipefail

# Parse hook input - handle potential control characters in JSON
input=$(cat | tr -d '\000-\011\013-\037')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

# Exit early if no file path
[[ -z "$file_path" ]] && exit 0

# Only process TypeScript files
[[ "$file_path" =~ \.(ts|tsx)$ ]] || exit 0

# Run eslint_d with --fix silently
eslint_output=$(ESLINT_IN_EDITOR=true eslint_d --cache --fix "$file_path" 2>&1 || true)

# Check if ESLint found unfixable errors
if echo "$eslint_output" | grep -qi "error"; then
	# Extract only error lines (first 5)
	errors=$(echo "$eslint_output" | grep -i "error" | head -5)

	# Output minimal JSON context for Claude
	jq -n \
		--arg errors "$errors" \
		--arg filepath "$file_path" \
		'{
			hookSpecificOutput: {
				hookEventName: "PostToolUse",
				additionalContext: ("⚠️ Lint errors in " + $filepath + ":\n" + $errors)
			}
		}'
	exit 0
fi

# Silent success - everything was auto-fixed
exit 0
