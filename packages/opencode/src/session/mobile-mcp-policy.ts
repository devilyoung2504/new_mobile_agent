const MOBILE_PREFIXES = ["mobile_", "mobile_mcp_"]

const READ_TOOLS = new Set([
  "mobile_list_available_devices",
  "mobile_get_screen_size",
  "mobile_get_orientation",
  "mobile_take_screenshot",
  "mobile_save_screenshot",
  "mobile_list_elements_on_screen",
  "mobile_list_apps",
])

export function classifyMobileMcpTool(toolName: string) {
  const prefix = MOBILE_PREFIXES.find((item) => toolName.startsWith(item))
  if (!prefix) return "other"
  const normalized = toolName.startsWith("mobile_mcp_mobile_") ? toolName.slice("mobile_mcp_".length) : toolName
  if (READ_TOOLS.has(normalized)) return "read"
  return "approval"
}
