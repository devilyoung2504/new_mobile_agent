import { describe, expect, test } from "bun:test"
import path from "node:path"

const root = path.resolve(import.meta.dir, "..")
const script = path.join(root, "script/resolve-product-context.ts")
const fixture = (name: string) => path.join(root, "script/fixtures/product-context", name)

describe("product context resolver", () => {
  test("valid seed resolves expected context", async () => {
    const result = await run("valid.seed.json")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      user: "dev@empresa.com",
      projects: ["TryController"],
      selectedProduct: "trycontroller-mobile",
      selectedSkill: "android",
      contextPacks: ["business-rules", "repo-guide", "qa-known-issues"],
      allowedTools: ["azure-devops-read", "repo-read", "android-skills"],
    })
  })

  test("email input resolves mock user details", async () => {
    const result = await run("valid.seed.json", "--email", "dev@empresa.com")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).user).toEqual({
      email: "dev@empresa.com",
      displayName: "Mobile Agent Developer",
      tenantId: "mock-tenant",
      objectId: "mock-object",
    })
  })

  test("project input selects project without changing product", async () => {
    const result = await run("valid.seed.json", "--project", "TryController")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      selectedProject: "TryController",
      selectedProduct: "trycontroller-mobile",
      selectedSkill: "android",
    })
  })

  test("ado flag adds read-only profile", async () => {
    const result = await run("valid.seed.json", "--with-ado-readonly")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).ado).toEqual({
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

  test("ado flag uses email input", async () => {
    const result = await run("valid.seed.json", "--email", "dev@empresa.com", "--with-ado-readonly")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).ado.userEmail).toBe("dev@empresa.com")
  })

  test("ado flag filters by selected project", async () => {
    const result = await run("valid.seed.json", "--project", "TryController", "--with-ado-readonly")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).ado.projects).toHaveLength(1)
    expect(JSON.parse(result.stdout).ado.projects[0].name).toBe("TryController")
  })

  test("ado flag fails when product project is missing in ado profile", async () => {
    const result = await run("ado-missing-project.seed.json", "--project", "OtherProject", "--with-ado-readonly")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("Azure DevOps project not found")
  })

  test("ado flag fails when ado project has no product mapping", async () => {
    const result = await run("missing-product.seed.json", "--project", "TryController", "--with-ado-readonly")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("No product profile found for project TryController")
  })

  test("unknown project exits non-zero", async () => {
    const result = await run("valid.seed.json", "--project", "MissingProject")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("Project not found")
  })

  test("unknown product exits non-zero", async () => {
    const result = await run("missing-product.seed.json")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("No product profile found")
  })

  test("unknown skill exits non-zero", async () => {
    const result = await run("missing-skill.seed.json")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("No skill found")
  })

  test("missing context pack exits non-zero", async () => {
    const result = await run("missing-context-pack.seed.json")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("No context pack found")
  })

  test("malformed JSON exits non-zero", async () => {
    const result = await run("malformed.seed.json")

    expect(result.exitCode).not.toBe(0)
  })

  test("--check returns ok only for valid contract", async () => {
    const valid = await run("valid.seed.json", "--check")
    const invalid = await run("missing-skill.seed.json", "--check")

    expect(valid.exitCode).toBe(0)
    expect(valid.stdout.trim()).toBe("resolved context ok")
    expect(invalid.exitCode).not.toBe(0)
  })
})

async function run(name: string, ...args: string[]) {
  const proc = Bun.spawn(["bun", script, "--seed", fixture(name), ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  })

  return {
    exitCode: await proc.exited,
    stdout: await new Response(proc.stdout).text(),
    stderr: await new Response(proc.stderr).text(),
  }
}
