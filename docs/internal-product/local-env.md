# Local Environment

Copy `.env.example` to `.env.local` and put real local values there.

Never commit `.env.local`. Never paste secrets into prompts, logs, commits,
issues, docs, or screenshots.

Minimum Entra variables for future local auth work:

- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`

Minimum Azure DevOps variables for future local read-only work:

- `AZURE_DEVOPS_ORG`
- `AZURE_DEVOPS_PROJECT`
- `AZURE_DEVOPS_REPOSITORY` if a repo-specific flow needs it
- `AZURE_DEVOPS_MCP_ORG`
- `AZURE_DEVOPS_MCP_PROJECT`
- `AZURE_DEVOPS_MCP_AUTHENTICATION=azcli`

Azure DevOps MCP local smoke uses `stdio` with Azure CLI auth. Log in with
`az login` first; do not use OpenCode's remote MCP OAuth flow for this server.

If the runtime does not load `.env.local` automatically, load it in the shell:

```sh
set -a
source .env.local
set +a
```

Validate required names without printing values:

```sh
bun script/validate-local-env.ts
```

Smoke the MCP registration:

```sh
bun run --cwd packages/opencode src/index.ts mcp list
```

If `AZURE_DEVOPS_MCP_PROJECT` contains more than one project, pass the target
project explicitly in the smoke prompt. The MCP connects, but the model cannot
infer one project from a comma-separated list.
