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
