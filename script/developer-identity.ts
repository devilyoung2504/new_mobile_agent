export type DeveloperIdentity = {
  email: string
  displayName: string
  tenantId: string
  objectId: string
  source: "mock" | "entra"
}

export function resolveMockDeveloperIdentity(overrides: Partial<Pick<DeveloperIdentity, "email" | "displayName">> = {}) {
  return {
    email: overrides.email ?? "dev@empresa.com",
    displayName: overrides.displayName ?? "Mobile Agent Developer",
    tenantId: "mock-tenant",
    objectId: "mock-object",
    source: "mock" as const,
  }
}
