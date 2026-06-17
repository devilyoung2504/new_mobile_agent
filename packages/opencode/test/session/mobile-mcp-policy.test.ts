import { describe, expect, test } from "bun:test"
import { classifyMobileMcpTool } from "../../src/session/mobile-mcp-policy"

describe("classifyMobileMcpTool", () => {
  test("allows observation tools without approval", () => {
    expect(classifyMobileMcpTool("mobile_list_available_devices")).toBe("read")
    expect(classifyMobileMcpTool("mobile_get_screen_size")).toBe("read")
    expect(classifyMobileMcpTool("mobile_get_orientation")).toBe("read")
    expect(classifyMobileMcpTool("mobile_take_screenshot")).toBe("read")
    expect(classifyMobileMcpTool("mobile_list_elements_on_screen")).toBe("read")
    expect(classifyMobileMcpTool("mobile_mcp_mobile_list_available_devices")).toBe("read")
  })

  test("requires approval for interactive or mutating tools", () => {
    expect(classifyMobileMcpTool("mobile_set_orientation")).toBe("approval")
    expect(classifyMobileMcpTool("mobile_launch_app")).toBe("approval")
    expect(classifyMobileMcpTool("mobile_click_on_screen_at_coordinates")).toBe("approval")
    expect(classifyMobileMcpTool("mobile_type_keys")).toBe("approval")
    expect(classifyMobileMcpTool("mobile_press_button")).toBe("approval")
    expect(classifyMobileMcpTool("mobile_mcp_mobile_press_button")).toBe("approval")
  })

  test("requires approval for unknown mobile tools", () => {
    expect(classifyMobileMcpTool("mobile_do_new_thing")).toBe("approval")
  })

  test("ignores non mobile tools", () => {
    expect(classifyMobileMcpTool("android_skills_search_skills")).toBe("other")
  })
})
