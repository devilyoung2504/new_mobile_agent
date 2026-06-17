import { describe, expect, test } from "bun:test"
import { classifyAzureDevopsMcpTool } from "../../src/session/ado-mcp-policy"

describe("classifyAzureDevopsMcpTool", () => {
  test("allows Azure DevOps read operations without approval", () => {
    expect(classifyAzureDevopsMcpTool("azure_devops_repo_list_repos_by_project")).toBe("read")
    expect(classifyAzureDevopsMcpTool("azure_devops_wit_get_work_item")).toBe("read")
    expect(classifyAzureDevopsMcpTool("azure_devops_search_code")).toBe("read")
  })

  test("requires approval for Azure DevOps write operations", () => {
    expect(classifyAzureDevopsMcpTool("azure_devops_repo_create_pull_request")).toBe("approval")
    expect(classifyAzureDevopsMcpTool("azure_devops_wit_update_work_item")).toBe("approval")
    expect(classifyAzureDevopsMcpTool("azure_devops_wit_comment_work_item")).toBe("approval")
    expect(classifyAzureDevopsMcpTool("azure_devops_wit_add_work_item_comment")).toBe("approval")
  })

  test("uses the operation verb instead of raw substrings", () => {
    expect(classifyAzureDevopsMcpTool("azure_devops_repo_list_branches")).toBe("read")
    expect(classifyAzureDevopsMcpTool("azure_devops_pipeline_list_pipeline_runs")).toBe("read")
    expect(classifyAzureDevopsMcpTool("azure_devops_repo_create_branch")).toBe("approval")
  })

  test("requires approval for unknown Azure DevOps operations", () => {
    expect(classifyAzureDevopsMcpTool("azure_devops_repo_inspect_policy")).toBe("approval")
  })

  test("ignores non Azure DevOps tools", () => {
    expect(classifyAzureDevopsMcpTool("github_list_pull_requests")).toBe("other")
  })
})
