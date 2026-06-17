# ADR 0003: Entra and Azure DevOps read-only boundary

## Status

Accepted for MVP.

## Context

OpenCode is a runtime/worker in this fork. It should execute local agent work and
governed tools, but it should not become the corporate identity provider, token
store, policy engine, or audit system.

The backend/orchestrator owns identity, session, tokens, policy, approvals, and
audit. Entra ID and Azure DevOps must stay behind that boundary.

## Decision

Entra authenticates the human developer identity. Azure DevOps authorizes real
access to organizations, projects, repositories, pull requests, work items, and
test plans.

OpenCode receives only filtered context and governed tools. The agent must not
access Azure DevOps MCP directly without passing through an internal gateway and
policy allowlist.

The first integration phase is read-only.

## Read-only Policy

The initial Azure DevOps surface may only read scoped data:

- Organizations and projects visible to the actor.
- Repositories visible to the actor.
- Pull requests visible to the actor.
- Work items visible to the actor.
- Test plans visible to the actor, if enabled for the product.

All reads must be scoped by the orchestrator. Missing scope, unknown project,
unknown repository, or unknown tool means reject by default.

## Forbidden Actions

The initial phase must reject any Azure DevOps action that creates, mutates,
executes, or changes persistent state.

Forbidden examples:

- Create branches, repositories, work items, pull requests, builds, releases, or
  test plans.
- Update, patch, rename, assign, transition, close, approve, complete, merge, or
  delete anything in Azure DevOps.
- Add, remove, or edit comments.
- Queue or run pipelines.
- Change repository contents, branch policies, permissions, service hooks, or
  project settings.
- Use generic HTTP tools as a bypass around the Azure DevOps policy boundary.

Future write support requires a separate human approval gate, one-shot approval,
operation-specific allowlist, and server-side execution. It is not part of this
ADR.

## Security Boundary

MCP is not the security policy. MCP is only a transport/tool surface.

The real security boundary must be:

- Backend/orchestrator session validation.
- Actor scope resolution.
- Operation-specific allowlist.
- Read-only gateway enforcement.
- Server-side credential handling.
- Audit of allowed and rejected operations.

Tokens and secrets must never be visible to the model, prompts, frontend state,
workspace files, shell output, or OpenCode runtime logs. This includes Entra
client secrets, OAuth authorization codes, PKCE verifier, refresh tokens, Azure
DevOps access tokens, PATs, session cookies, and full `.env` content.

## Validation

For this documentation-only cut, run:

```sh
git diff --check
bun script/resolve-product-context.ts --check
bun script/resolve-product-context.ts
bun run typecheck
git status --short
```

## Non-goals

This ADR does not implement:

- Entra login or OAuth callback.
- Azure DevOps MCP connection.
- Azure DevOps REST probe.
- Android MCP.
- Android automation.
- Dashboard work.
- Model gateway work.
- Repository modification.
- Pull request, work item, pipeline, permission, or branch writes.
