# Android Skills MCP

Local MVP uses a combined Android Skills MCP fork at:

```text
/Users/dev14/Desktop/WorkProjects/Mobile agent/android-skills-mcp
```

Sources:

- `android/skills`, synced by the MCP repo with `pnpm sync:skills`
- `skydoves/android-testing-skills`, cloned locally at `../android-testing-skills`

IDs are namespaced:

- `android/<skill-id>`
- `testing/<category>/<skill-id>`

Local build:

```sh
cd "/Users/dev14/Desktop/WorkProjects/Mobile agent/android-skills-mcp"
corepack pnpm install
corepack pnpm sync:skills
ANDROID_TESTING_SKILLS_DIR="/Users/dev14/Desktop/WorkProjects/Mobile agent/android-testing-skills" corepack pnpm -F android-skills-mcp build
node packages/mcp/scripts/verify-mcp-client.mjs
```

OpenCode loads it through `.opencode/opencode.jsonc` as `android_skills`.

This MCP only provides Android and Android testing knowledge. It does not run
emulators, call ADB, modify repos, replace Azure DevOps MCP, or perform writes.
