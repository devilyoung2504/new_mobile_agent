const AZURE_DEVOPS_PREFIX = "azure_devops_"

const READ_VERBS = new Set(["list", "get", "read", "search", "query", "show", "find", "describe"])

const WRITE_VERBS = new Set([
  "create",
  "update",
  "delete",
  "remove",
  "patch",
  "write",
  "comment",
  "approve",
  "merge",
  "complete",
  "queue",
  "run",
  "assign",
  "transition",
  "set",
  "publish",
  "post",
  "put",
  "execute",
  "dispatch",
  "submit",
  "push",
])

export function classifyAzureDevopsMcpTool(toolName: string) {
  if (!toolName.startsWith(AZURE_DEVOPS_PREFIX)) return "other"

  const verb = toolName
    .slice(AZURE_DEVOPS_PREFIX.length)
    .split("_")
    .find((token) => READ_VERBS.has(token) || WRITE_VERBS.has(token))

  if (!verb) return "approval"
  if (WRITE_VERBS.has(verb)) return "approval"
  return "read"
}
