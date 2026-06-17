import { describe, expect, test } from "bun:test"
import { developerIdentityFromEntraClaims } from "./entra-claims"

describe("entra claims", () => {
  test("maps complete claims", () => {
    expect(
      developerIdentityFromEntraClaims({
        tid: "tenant-1",
        oid: "object-1",
        email: "dev@empresa.com",
        preferred_username: "ignored@empresa.com",
        upn: "ignored-upn@empresa.com",
        name: "Dev User",
      }),
    ).toEqual({
      email: "dev@empresa.com",
      displayName: "Dev User",
      tenantId: "tenant-1",
      objectId: "object-1",
      source: "entra",
    })
  })

  test("uses preferred username when email is missing", () => {
    expect(
      developerIdentityFromEntraClaims({
        tid: "tenant-1",
        oid: "object-1",
        preferred_username: "preferred@empresa.com",
        upn: "ignored-upn@empresa.com",
      }).email,
    ).toBe("preferred@empresa.com")
  })

  test("uses upn when email and preferred username are missing", () => {
    expect(
      developerIdentityFromEntraClaims({
        tid: "tenant-1",
        oid: "object-1",
        upn: "upn@empresa.com",
      }).email,
    ).toBe("upn@empresa.com")
  })

  test("uses email as display name when name is missing", () => {
    expect(
      developerIdentityFromEntraClaims({
        tid: "tenant-1",
        oid: "object-1",
        email: "dev@empresa.com",
      }).displayName,
    ).toBe("dev@empresa.com")
  })

  test("fails when tenant id is missing", () => {
    expect(() =>
      developerIdentityFromEntraClaims({
        oid: "object-1",
        email: "dev@empresa.com",
      }),
    ).toThrow("Missing Entra tenant id")
  })

  test("fails when object id is missing", () => {
    expect(() =>
      developerIdentityFromEntraClaims({
        tid: "tenant-1",
        email: "dev@empresa.com",
      }),
    ).toThrow("Missing Entra object id")
  })

  test("fails when email identifiers are missing", () => {
    expect(() =>
      developerIdentityFromEntraClaims({
        tid: "tenant-1",
        oid: "object-1",
      }),
    ).toThrow("Missing Entra email claim")
  })
})
