import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { retrieveRelevantChunks } from "./retrieval";
import { generateEmbedding } from "@/lib/embeddings";

describe("retrieveRelevantChunks", () => {
  let documentId: string;

  beforeAll(async () => {
    const embedding = await generateEmbedding(
      "Klorofyll är ett grönt pigment som absorberar ljus i växter.",
    );
    const vectorLiteral = `[${embedding.join(",")}]`;

    const document = await prisma.document.create({
      data: {
        title: "Test: Klorofyll",
        chunks: {
          create: {
            content:
              "Klorofyll är ett grönt pigment som absorberar ljus i växter.",
            chunkIndex: 0,
          },
        },
      },
      include: { chunks: true },
    });

    documentId = document.id;

    await prisma.$executeRaw`
      UPDATE "Chunk" SET embedding = ${vectorLiteral}::vector
      WHERE id = ${document.chunks[0].id}
    `;
  });

  afterAll(async () => {
    if (documentId) {
      await prisma.document.delete({ where: { id: documentId } });
    }
  });

  it("returns relevant chunks for a query", async () => {
    const results = await retrieveRelevantChunks("Vad är klorofyll?");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].similarity).toBeGreaterThan(0);
  });

  it("respects the limit parameter", async () => {
    const results = await retrieveRelevantChunks("fotosyntes", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
