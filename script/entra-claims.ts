import type { DeveloperIdentity } from "./developer-identity"

export type EntraClaims = {
  tid?: string
  oid?: string
  email?: string
  preferred_username?: string
  upn?: string
  name?: string
}

export function developerIdentityFromEntraClaims(claims: EntraClaims): DeveloperIdentity {
  const email = requireClaim(claims.email ?? claims.preferred_username ?? claims.upn, "Missing Entra email claim")

  return {
    email,
    displayName: claims.name ?? email,
    tenantId: requireClaim(claims.tid, "Missing Entra tenant id (tid)"),
    objectId: requireClaim(claims.oid, "Missing Entra object id (oid)"),
    source: "entra",
  }
}

function requireClaim(value: string | undefined, message: string) {
  if (value) return value
  throw new Error(message)
}
