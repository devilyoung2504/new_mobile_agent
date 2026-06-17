# Mobile MCP

Local MVP uses `@mobilenext/mobile-mcp@latest` through OpenCode MCP config.

Mobile MCP is for observing and lightly controlling an Android emulator/device:

- list connected devices
- get screen size and orientation
- take screenshots
- inspect visible screen elements
- perform controlled input actions when approved

It does not replace Azure DevOps MCP, Android Skills MCP, Gradle builds, or repo
editing. It should not touch personal/sensitive apps.

Requirements:

```sh
/Users/dev14/Library/Android/sdk/platform-tools/adb devices
set -a
source .env
set +a
bun packages/opencode/src/index.ts mcp list
bun run run:interactive -- "Use Mobile MCP to press BACK on emulator-5554"
```

`run --interactive` must start from `packages/opencode`; the root script above
does that so Bun picks up the package JSX runtime config for the TUI.

Approval policy:

- Observation tools run directly.
- Input, launch/install/uninstall, orientation changes, URLs, and unknown mobile
  tools require OpenCode human approval.
- Rejected approval must stop the MCP call before execution.
