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

  test("explicit mock identity source preserves local identity behavior", async () => {
    const result = await run("valid.seed.json", "--identity-source", "mock", "--email", "dev@empresa.com")

    expect(result.exitCode).toBe(0)
    expect(JSON.parse(result.stdout).user.source).toBeUndefined()
    expect(JSON.parse(result.stdout).user.email).toBe("dev@empresa.com")
  })

  test("unknown identity source exits non-zero", async () => {
    const result = await run("valid.seed.json", "--identity-source", "missing")

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain("Unsupported identity source")
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
