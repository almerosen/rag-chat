import { describe, it, expect } from "vitest";
import { chunkText } from "./chunking";

describe("chunkText", () => {
  it("returns single chunk for short text", () => {
    const result = chunkText("Hello world");
    expect(result).toHaveLength(1);
  });

  it("splits long text into multiple chunks", () => {
    const longText = "A".repeat(2000);
    const result = chunkText(longText, { chunkSize: 500, overlap: 50 });
    expect(result.length).toBeGreaterThan(1);
  });

  it("respects paragraph boundaries when possible", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const result = chunkText(text, { chunkSize: 30, overlap: 5 });
    expect(result.length).toBeGreaterThan(1);
  });
});
