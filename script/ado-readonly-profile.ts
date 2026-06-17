export type AdoRepositoryAccess = {
  name: string
  defaultBranch: string
}

export type AdoProjectAccess = {
  name: string
  repositories: AdoRepositoryAccess[]
  workItemsReadable: boolean
  pullRequestsReadable: boolean
  testPlansReadable: boolean
}

export type AdoReadOnlyProfile = {
  organization: string
  userEmail: string
  projects: AdoProjectAccess[]
  source: "mock" | "ado"
}

const mockProjects: AdoProjectAccess[] = [
  {
    name: "TryController",
    repositories: [{ name: "TryControllerApp", defaultBranch: "develop" }],
    workItemsReadable: true,
    pullRequestsReadable: true,
    testPlansReadable: true,
  },
]

export function resolveMockAdoReadOnlyProfile(input: {
  userEmail: string
  organization?: string
  project?: string
  repo?: string
}): AdoReadOnlyProfile {
  return {
    organization: input.organization ?? "trycontroller",
    userEmail: input.userEmail,
    projects: (input.project ? [requireProject(input.project)] : mockProjects).map((project) => ({
      ...project,
      repositories: (input.repo ? [requireRepository(project, input.repo)] : project.repositories).map((repo) => ({
        ...repo,
      })),
    })),
    source: "mock",
  }
}

function requireProject(name: string) {
  const project = mockProjects.find((item) => item.name === name)
  if (project) return project
  throw new Error(`Azure DevOps project not found in mock profile: ${name}`)
}

function requireRepository(project: AdoProjectAccess, name: string) {
  const repo = project.repositories.find((item) => item.name === name)
  if (repo) return repo
  throw new Error(`Azure DevOps repository not found in mock profile for ${project.name}: ${name}`)
}
