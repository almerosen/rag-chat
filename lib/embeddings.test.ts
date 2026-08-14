import { describe, it, expect } from "vitest";
import { generateEmbedding } from "./embeddings";

describe("generateEmbedding", () => {
  it("returns a 1536-dimensional vector", async () => {
    const embedding = await generateEmbedding("Hello world");
    expect(embedding).toHaveLength(1536);
  });
});
