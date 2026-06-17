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
