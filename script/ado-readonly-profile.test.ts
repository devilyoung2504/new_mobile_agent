import { describe, expect, test } from "bun:test"
import { resolveMockAdoReadOnlyProfile } from "./ado-readonly-profile"

describe("ado read-only profile", () => {
  test("returns stable mock profile", () => {
    expect(resolveMockAdoReadOnlyProfile({ userEmail: "dev@empresa.com" })).toEqual({
      organization: "trycontroller",
      userEmail: "dev@empresa.com",
      projects: [
        {
          name: "TryController",
          repositories: [{ name: "TryControllerApp", defaultBranch: "develop" }],
          workItemsReadable: true,
          pullRequestsReadable: true,
          testPlansReadable: true,
        },
      ],
      source: "mock",
    })
  })

  test("respects user email", () => {
    expect(resolveMockAdoReadOnlyProfile({ userEmail: "other@empresa.com" }).userEmail).toBe("other@empresa.com")
  })

  test("filters by valid project", () => {
    expect(resolveMockAdoReadOnlyProfile({ userEmail: "dev@empresa.com", project: "TryController" }).projects).toEqual([
      {
        name: "TryController",
        repositories: [{ name: "TryControllerApp", defaultBranch: "develop" }],
        workItemsReadable: true,
        pullRequestsReadable: true,
        testPlansReadable: true,
      },
    ])
  })

  test("filters by valid repository", () => {
    expect(
      resolveMockAdoReadOnlyProfile({
        userEmail: "dev@empresa.com",
        project: "TryController",
        repo: "TryControllerApp",
      }).projects[0]?.repositories,
    ).toEqual([{ name: "TryControllerApp", defaultBranch: "develop" }])
  })

  test("fails for unknown project", () => {
    expect(() => resolveMockAdoReadOnlyProfile({ userEmail: "dev@empresa.com", project: "MissingProject" })).toThrow(
      "Azure DevOps project not found",
    )
  })

  test("fails for unknown repository", () => {
    expect(() =>
      resolveMockAdoReadOnlyProfile({
        userEmail: "dev@empresa.com",
        project: "TryController",
        repo: "MissingRepo",
      }),
    ).toThrow("Azure DevOps repository not found")
  })

  test("uses mock source", () => {
    expect(resolveMockAdoReadOnlyProfile({ userEmail: "dev@empresa.com" }).source).toBe("mock")
  })

  test("does not require env or network", () => {
    const previous = process.env.AZURE_DEVOPS_EXT_PAT
    const previousFetch = globalThis.fetch
    process.env.AZURE_DEVOPS_EXT_PAT = "ignored"
    globalThis.fetch = (() => {
      throw new Error("network not allowed")
    }) as typeof fetch

    try {
      expect(resolveMockAdoReadOnlyProfile({ userEmail: "dev@empresa.com" }).organization).toBe("trycontroller")
    } finally {
      if (previous === undefined) delete process.env.AZURE_DEVOPS_EXT_PAT
      else process.env.AZURE_DEVOPS_EXT_PAT = previous
      globalThis.fetch = previousFetch
    }
  })
})
