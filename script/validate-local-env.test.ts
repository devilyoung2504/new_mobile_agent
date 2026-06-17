import { describe, expect, test } from "bun:test"
import { missingLocalEnv } from "./validate-local-env"

describe("validate local env", () => {
  test("fails when required variables are missing", () => {
    expect(missingLocalEnv({})).toEqual([
      "ENTRA_TENANT_ID",
      "ENTRA_CLIENT_ID",
      "ENTRA_CLIENT_SECRET",
      "AZURE_DEVOPS_ORG",
      "AZURE_DEVOPS_PROJECT",
    ])
  })

  test("passes when required variables are present", () => {
    expect(
      missingLocalEnv({
        ENTRA_TENANT_ID: "tenant-secret-value",
        ENTRA_CLIENT_ID: "client-secret-value",
        ENTRA_CLIENT_SECRET: "secret-value",
        AZURE_DEVOPS_ORG: "org-secret-value",
        AZURE_DEVOPS_PROJECT: "project-secret-value",
      }),
    ).toEqual([])
  })

  test("does not expose secret values in missing output", () => {
    expect(
      missingLocalEnv({
        ENTRA_TENANT_ID: "tenant-secret-value",
        ENTRA_CLIENT_ID: "client-secret-value",
      }).join(" "),
    ).not.toContain("secret-value")
  })

  test("allows optional variables to be absent", () => {
    expect(
      missingLocalEnv({
        ENTRA_TENANT_ID: "tenant",
        ENTRA_CLIENT_ID: "client",
        ENTRA_CLIENT_SECRET: "secret",
        AZURE_DEVOPS_ORG: "org",
        AZURE_DEVOPS_PROJECT: "project",
      }),
    ).toEqual([])
  })
})
