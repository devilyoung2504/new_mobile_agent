# Internal Product Structure

This is the smallest useful product structure for the next implementation cut.
It is static on purpose: no Entra login, no Azure DevOps call, no MCP execution,
no Android automation, and no OpenCode runtime change.

Source file:

- `docs/internal-product/product-context.seed.json`

The seed defines enough data for a future resolver to produce one stable context:

```json
{
  "user": "dev@empresa.com",
  "projects": ["TryController"],
  "selectedProduct": "trycontroller-mobile",
  "selectedSkill": "android",
  "contextPacks": ["business-rules", "repo-guide", "qa-known-issues"],
  "allowedTools": ["azure-devops-read", "repo-read", "android-skills"]
}
```

## Resolution Order

1. Read the identity mock.
2. Match a developer profile by actor domain or explicit actor id.
3. Resolve the default product from the developer profile.
4. Resolve the default skill from the product profile.
5. Load the context pack ids declared by the product profile.
6. Return the resolved context without executing tools.

## Boundaries

The seed may contain:

- Non-secret identity shape.
- Developer profile scope.
- Product profile metadata.
- Skill id and execution mode.
- Context pack ids and local documentation paths.
- Expected resolved context for tests.

The seed must not contain:

- Entra client secrets.
- Access tokens.
- Refresh tokens.
- PATs.
- Cookies.
- Full `.env` content.
- Azure DevOps write permissions.
- MCP credentials.

## Resolver Check

Run:

```sh
bun script/resolve-product-context.ts --check
```

Success means the resolver can emit the expected JSON deterministically from the
seed, with no network access and no secrets.
