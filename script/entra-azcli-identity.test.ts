import { describe, expect, test } from "bun:test"
import { resolveAzcliDeveloperIdentity } from "./entra-azcli-identity"

describe("entra azcli identity", () => {
  test("maps Azure CLI account data to developer identity", async () => {
    const calls: string[][] = []
    const identity = await resolveAzcliDeveloperIdentity(async (args) => {
      calls.push(args)
      if (args[0] === "account") {
        return JSON.stringify({
          tenantId: "tenant-1",
          user: { name: "dev@empresa.com" },
        })
      }
      return "object-1\n"
    })

    expect(identity).toEqual({
      email: "dev@empresa.com",
      displayName: "dev@empresa.com",
      tenantId: "tenant-1",
      objectId: "object-1",
      source: "entra",
    })
    expect(calls).toEqual([
      ["account", "show", "--output", "json"],
      ["ad", "signed-in-user", "show", "--query", "id", "--output", "tsv"],
    ])
  })

  test("does not request tokens", async () => {
    await resolveAzcliDeveloperIdentity(async (args) => {
      expect(args).not.toContain("get-access-token")
      if (args[0] === "account") return JSON.stringify({ tenantId: "tenant-1", user: { name: "dev@empresa.com" } })
      return "object-1"
    })
  })

  test("fails clearly when object id is missing", async () => {
    await expect(
      resolveAzcliDeveloperIdentity(async (args) => {
        if (args[0] === "account") return JSON.stringify({ tenantId: "tenant-1", user: { name: "dev@empresa.com" } })
        return ""
      }),
    ).rejects.toThrow("object id")
  })
})
