import { describe, expect, it } from "vitest";
import { clearRemoteModels, reconcileActiveModels, selectRemoteModels } from "./models";

const manual = { id: "manual", name: "手工模型", source: "manual" };
const oldRemote = { id: "old", name: "旧模型", source: "remote" };

describe("model selection state", () => {
  it("clears remote models while preserving manual models", () => {
    expect(clearRemoteModels([manual, oldRemote])).toEqual([manual]);
  });

  it("keeps only explicitly selected remote candidates", () => {
    const result = selectRemoteModels(
      [manual, oldRemote],
      [{ id: "new-a", name: "A" }, { id: "new-b", name: "B" }],
      new Set(["new-b"]),
    );
    expect(result).toEqual([manual, { id: "new-b", name: "B", source: "remote" }]);
  });

  it("supports an empty selection", () => {
    expect(selectRemoteModels([manual, oldRemote], [{ id: "new" }], new Set())).toEqual([manual]);
  });

  it("prefers manual models when ids conflict", () => {
    expect(selectRemoteModels([manual], [{ id: " manual ", name: "远程同名" }], new Set(["manual"]))).toEqual([manual]);
  });

  it("deduplicates trimmed candidate ids", () => {
    expect(selectRemoteModels([], [{ id: " model " }, { id: "model" }], new Set(["model"]))).toEqual([
      { id: "model", source: "remote" },
    ]);
  });

  it("clears active models that no longer exist", () => {
    expect(reconcileActiveModels([manual], "old", "manual")).toEqual({ textModel: "", imageModel: "manual" });
  });
});
