import { describe, expect, test } from "bun:test"
import { resolveMockDeveloperIdentity } from "./developer-identity"

describe("developer identity", () => {
  test("returns stable mock identity", () => {
    expect(resolveMockDeveloperIdentity()).toEqual({
      email: "dev@empresa.com",
      displayName: "Mobile Agent Developer",
      tenantId: "mock-tenant",
      objectId: "mock-object",
      source: "mock",
    })
  })

  test("allows email and display name overrides", () => {
    expect(resolveMockDeveloperIdentity({ email: "other@empresa.com", displayName: "Other Developer" })).toEqual({
      email: "other@empresa.com",
      displayName: "Other Developer",
      tenantId: "mock-tenant",
      objectId: "mock-object",
      source: "mock",
    })
  })

  test("does not require env", () => {
    const previous = process.env.ENTRA_CLIENT_ID
    process.env.ENTRA_CLIENT_ID = "ignored"

    try {
      expect(resolveMockDeveloperIdentity().objectId).toBe("mock-object")
    } finally {
      if (previous === undefined) delete process.env.ENTRA_CLIENT_ID
      else process.env.ENTRA_CLIENT_ID = previous
    }
  })
})
