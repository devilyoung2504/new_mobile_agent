#!/usr/bin/env bun

type Env = Record<string, string | undefined>

export const requiredLocalEnv = [
  "ENTRA_TENANT_ID",
  "ENTRA_CLIENT_ID",
  "ENTRA_CLIENT_SECRET",
  "AZURE_DEVOPS_ORG",
  "AZURE_DEVOPS_PROJECT",
] as const

export function missingLocalEnv(env: Env = process.env) {
  return requiredLocalEnv.filter((name) => !env[name])
}

if (import.meta.main) {
  const missing = missingLocalEnv()
  if (missing.length === 0) {
    console.log("ok")
    process.exit(0)
  }

  console.error(`Missing required env vars: ${missing.join(", ")}`)
  process.exit(1)
}
