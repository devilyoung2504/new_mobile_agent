# Corporate Fork Baseline

This fork starts from upstream OpenCode `v1.17.7` and should stay close to
upstream. The first phase is baseline validation and non-destructive cleanup
only. Do not remove packages or change runtime behavior until each candidate
cut has an isolated validation pass.

## Repository State

- Upstream remote: `upstream=https://github.com/anomalyco/opencode.git`.
- Baseline branch: `corp-baseline`.
- Package manager: `bun@1.3.14`.
- Root typecheck currently covers broad workspace scope, including packages
  that are not part of the corporate runtime target.

## Supported Baseline Commands

Run these from the repository root unless noted otherwise:

```bash
bun install
bun run typecheck
bun run --cwd packages/opencode typecheck
bun run --cwd packages/opencode --conditions=browser src/index.ts --help
```

Optional UI validation, only when the web app is intentionally in scope:

```bash
bun run dev:web
```

Do not use root `bun test` as a baseline check. Upstream intentionally blocks
root tests with `echo 'do not run tests from root' && exit 1`; run package-level
tests instead when a later change touches a package.

## Scripts Not In Corporate Baseline

These root scripts remain available upstream, but are not supported as baseline
corporate runtime checks in this phase:

- `dev:desktop`
- `dev:stats`
- `dev:storybook`
- `dev:console`
- `sso`
- public release or packaging scripts

Leaving them in place is deliberate. Removing scripts or workspaces before a
package-level dependency audit makes upstream merges harder and can break root
typecheck/postinstall behavior.

## Package Classification

Keep for the initial runtime baseline:

- `packages/opencode`
- `packages/cli`
- `packages/core`
- `packages/server`
- `packages/llm`
- `packages/tui`
- `packages/ui`
- `packages/sdk/js`
- `packages/plugin`
- `packages/script`

Preserve until proven otherwise:

- `packages/identity` asset files. This directory has no package manifest in
  `v1.17.7`, but may be referenced by app or release assets.
- `packages/containers`, `packages/docs`, `packages/function`,
  `packages/enterprise`, `packages/http-recorder`,
  `packages/effect-drizzle-sqlite`, and `packages/effect-sqlite-node`.
  These are workspace-visible or repo-visible surfaces and need import/build
  checks before any cleanup.

Candidate cleanup packages, after isolated proof:

- public docs and localized README files
- `packages/storybook`
- `packages/stats/*`
- `packages/slack`
- `packages/desktop`
- `packages/console/*`
- public release and infrastructure-only files

Deletion rule: remove at most one candidate group per change, then rerun
`bun install`, root typecheck, `packages/opencode` typecheck, and the CLI smoke
command. Revert the cut if any check fails or if workspace resolution changes in
a way that is not understood.

## Entra and Azure DevOps Boundary

No Entra ID, Azure DevOps, Android skill, Mobile MCP, custom dashboard, or RAG
implementation belongs in this baseline.

Future Entra/Azure DevOps work must start by inspecting the real `mobile-agent`
repository. That source is not present in this checkout yet. Until it is
available, do not invent:

- login routes
- OAuth/OIDC state, PKCE, callback, or token storage behavior
- tenant/client/scope variables
- Azure DevOps REST clients
- token refresh behavior
- write permissions or approval flows

The intended future boundary is:

- OpenCode runtime: agent runtime, generic tools, local execution, configuration.
- Backend/orchestrator: session, identity, token store, policy, audit.
- Entra auth: outside the runtime core.
- Azure DevOps: governed adapter or MCP surface, read-only by default.
- Persistent Azure DevOps writes: future human-approved workflow only.

Tokens and secrets must never be passed to prompts, frontend state, shell logs,
workspace files, or model-visible tool output.

## Immediate Next Step

Get the real `mobile-agent` path or remote before planning Entra/Azure DevOps
migration details. Treat any Entra/Azure DevOps design before that inspection as
unverified.
