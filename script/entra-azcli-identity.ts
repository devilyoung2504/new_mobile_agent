import type { DeveloperIdentity } from "./developer-identity"

type AzRunner = (args: string[]) => Promise<string>

type AzAccount = {
  tenantId?: string
  user?: {
    name?: string
  }
}

export async function resolveAzcliDeveloperIdentity(runAz: AzRunner = runAzCli): Promise<DeveloperIdentity> {
  const account = parseJson<AzAccount>(await runAz(["account", "show", "--output", "json"]), "az account show")
  const email = requireValue(account.user?.name, "az account show did not return the signed-in user email")
  const objectId = requireValue(
    (await runAz(["ad", "signed-in-user", "show", "--query", "id", "--output", "tsv"])).trim(),
    "az ad signed-in-user show did not return an object id",
  )

  return {
    email,
    displayName: email,
    tenantId: requireValue(account.tenantId, "az account show did not return tenantId"),
    objectId,
    source: "entra",
  }
}

async function runAzCli(args: string[]) {
  const proc = Bun.spawn(["az", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const stdout = await new Response(proc.stdout).text()
  const exitCode = await proc.exited
  if (exitCode === 0) return stdout
  throw new Error(`az ${args.slice(0, 2).join(" ")} failed; run az login and verify Azure CLI permissions`)
}

function parseJson<T>(value: string, label: string) {
  try {
    return JSON.parse(value) as T
  } catch {
    throw new Error(`${label} returned invalid JSON`)
  }
}

function requireValue(value: string | undefined, message: string) {
  if (value) return value
  throw new Error(message)
}
