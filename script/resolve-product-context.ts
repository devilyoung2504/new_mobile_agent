#!/usr/bin/env bun

import path from "node:path"
import { parseArgs } from "node:util"
import { resolveMockDeveloperIdentity } from "./developer-identity"
import { resolveAzcliDeveloperIdentity } from "./entra-azcli-identity"

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
    project?: string
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
    email: { type: "string" },
    "identity-source": { type: "string" },
    project: { type: "string" },
    seed: { type: "string" },
  },
})
const seed = (await Bun.file(path.resolve(root, values.seed ?? "docs/internal-product/product-context.seed.json")).json()) as Seed
const identitySource = values["identity-source"]
const identity = await resolveDeveloperIdentity(identitySource, values.email)
const email = identity?.email ?? seed.identityMock.email
const emailDomain = requireValue(email.split("@")[1], "Developer email must include a domain")
const developer = requireValue(
  seed.developerProfiles.find(
    (profile) =>
      values.email
        ? profile.actor_domains.includes(emailDomain)
        : profile.actor_ids.includes(seed.identityMock.actor_id) || profile.actor_domains.includes(emailDomain),
  ),
  `No developer profile matched ${email}`,
)
const selectedProject = values.project
if (selectedProject && !developer.projects.includes(selectedProject)) {
  console.error(`Project not found in developer profile: ${selectedProject}`)
  process.exit(1)
}
const productID = selectedProject
  ? requireValue(
      seed.productProfiles.find((profile) => profile.project === selectedProject)?.id,
      `No product profile found for project ${selectedProject}`,
    )
  : developer.default_product
const product = requireValue(
  seed.productProfiles.find((profile) => profile.id === productID),
  `No product profile found for ${productID}`,
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
  user: identity
    ? {
        email: identity.email,
        displayName: identity.displayName,
        tenantId: identity.tenantId,
        objectId: identity.objectId,
      }
    : seed.identityMock.email,
  projects: developer.projects,
  ...(selectedProject ? { selectedProject } : {}),
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

async function resolveDeveloperIdentity(source: string | undefined, email: string | undefined) {
  if (!source && !email) return undefined
  if (!source || source === "mock") return resolveMockDeveloperIdentity({ email })
  if (source === "azcli") {
    const identity = await resolveAzcliDeveloperIdentity()
    if (email && identity.email.toLowerCase() !== email.toLowerCase()) {
      console.error(`--email does not match azcli identity: ${email}`)
      process.exit(1)
    }
    return identity
  }
  console.error(`Unsupported identity source: ${source}`)
  process.exit(1)
}

function requireValue<T>(value: T | undefined, message: string) {
  if (value) return value
  console.error(message)
  process.exit(1)
}
