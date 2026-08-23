import { prisma } from "@/lib/db";
import { generateEmbedding } from "@/lib/embeddings";

export interface RetrievedChunk {
  id: string;
  content: string;
  documentId: string;
  documentTitle: string;
  similarity: number;
}

export async function retrieveRelevantChunks(
  query: string,
  limit = 5,
  minSimilarity = 0.3,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  const results = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT
      c.id,
      c.content,
      c."documentId",
      d.title AS "documentTitle",
      1 - (c.embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "Chunk" c
    JOIN "Document" d ON d.id = c."documentId"
    WHERE c.embedding IS NOT NULL
      AND 1 - (c.embedding <=> ${vectorLiteral}::vector) >= ${minSimilarity}
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `;

  return results;
}
