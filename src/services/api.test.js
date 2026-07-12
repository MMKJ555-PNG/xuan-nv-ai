import { describe, expect, it } from "vitest";
import { buildOpenAIUrl, normalizeApiBaseUrl, normalizeModelsResponse } from "./api";

describe("OpenAI compatible API helpers", () => {
  it.each([
    ["https://host.example", "https://host.example/v1/models"],
    ["https://host.example/", "https://host.example/v1/models"],
    ["https://host.example/v1", "https://host.example/v1/models"],
    ["https://host.example/proxy/v1/", "https://host.example/proxy/v1/models"],
  ])("builds one v1 segment for %s", (input, expected) => {
    expect(buildOpenAIUrl(input, "/models")).toBe(expected);
  });

  it("removes query and hash from the configured base", () => {
    expect(normalizeApiBaseUrl("https://host.example/openai/v1/?x=1#hash")).toBe("https://host.example/openai");
  });

  it("filters and deduplicates model responses", () => {
    expect(normalizeModelsResponse({ data: [
      { id: " gpt-4.1 ", owned_by: "openai" },
      { id: "gpt-4.1" },
      { id: "" },
      null,
    ] })).toEqual([{ id: "gpt-4.1", name: "gpt-4.1", source: "remote", ownedBy: "openai" }]);
  });

  it("rejects invalid model responses", () => {
    expect(() => normalizeModelsResponse({ models: [] })).toThrow("data 数组");
  });
});
