#!/usr/bin/env bun

import path from "node:path"
import { parseArgs } from "node:util"

type Seed = {
  identityMock: {
    actor_id: string
    email: string
  }
  developerProfiles: Array<{
    actor_domains: string[]
    actor_ids: string[]
    projects: string[]
    default_product: string
    allowed_tools: string[]
  }>
  productProfiles: Array<{
    id: string
    default_skill: string
    context_packs: string[]
  }>
  skills: Array<{
    id: string
  }>
  contextPacks: Array<{
    id: string
    source: string
  }>
  expectedResolvedContext: unknown
}

const root = path.resolve(import.meta.dir, "..")
const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    check: { type: "boolean", default: false },
    seed: { type: "string" },
  },
})
const seed = (await Bun.file(path.resolve(root, values.seed ?? "docs/internal-product/product-context.seed.json")).json()) as Seed
const emailDomain = requireValue(seed.identityMock.email.split("@")[1], "Identity mock email must include a domain")
const developer = requireValue(
  seed.developerProfiles.find(
    (profile) =>
      profile.actor_ids.includes(seed.identityMock.actor_id) || profile.actor_domains.includes(emailDomain),
  ),
  "No developer profile matched the identity mock",
)
const product = requireValue(
  seed.productProfiles.find((profile) => profile.id === developer.default_product),
  `No product profile found for ${developer.default_product}`,
)
const skill = requireValue(
  seed.skills.find((item) => item.id === product.default_skill),
  `No skill found for ${product.default_skill}`,
)

await Promise.all(
  product.context_packs.map(async (id) => {
    const pack = requireValue(
      seed.contextPacks.find((item) => item.id === id),
      `No context pack found for ${id}`,
    )
    if (await Bun.file(path.join(root, pack.source)).exists()) return
    console.error(`Context pack file not found: ${pack.source}`)
    process.exit(1)
  }),
)

const resolved = {
  user: seed.identityMock.email,
  projects: developer.projects,
  selectedProduct: product.id,
  selectedSkill: skill.id,
  contextPacks: product.context_packs,
  allowedTools: developer.allowed_tools,
}

if (values.check) {
  if (JSON.stringify(resolved) === JSON.stringify(seed.expectedResolvedContext)) {
    console.log("resolved context ok")
    process.exit(0)
  }
  console.error(JSON.stringify(resolved, null, 2))
  process.exit(1)
}

console.log(JSON.stringify(resolved, null, 2))

function requireValue<T>(value: T | undefined, message: string) {
  if (value) return value
  console.error(message)
  process.exit(1)
}
