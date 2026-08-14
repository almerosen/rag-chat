"use server";

import { Prisma } from "../generated/prisma/client";
import { prisma } from "@/lib/db";
import { chunkText } from "@/lib/chunking";
import { generateEmbeddings } from "@/lib/embeddings";
import { uploadDocumentSchema } from "@/lib/validations/document";

export type UploadState =
  | { success: true; message: string }
  | { success: false; error: string }
  | null;

export async function uploadDocument(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const raw = {
    title: formData.get("title"),
    content: formData.get("content"),
  };

  const parsed = uploadDocumentSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.flatten().formErrors.join(", ") || "Valideringsfel",
    };
  }

  const { title, content } = parsed.data;
  const chunks = chunkText(content);

  if (chunks.length === 0) {
    return {
      success: false,
      error: "Dokumentet är tomt eller kunde inte delas upp i chunks.",
    };
  }

  try {
    // 1. Generera embeddings för alla chunks i ett batch-anrop
    const embeddings = await generateEmbeddings(chunks);

    // 2. Skapa dokument + chunks och skriv embeddings i samma transaktion
    const document = await prisma.$transaction(
      async (tx) => {
        // Skapa dokumentet och dess relationer
        const created = await tx.document.create({
          data: {
            title,
            chunks: {
              create: chunks.map((chunkContent, index) => ({
                content: chunkContent,
                chunkIndex: index,
              })),
            },
          },
          include: { chunks: true },
        });

        // Sortera exakt på chunkIndex för att garantera att rätt vektor hamnar på rätt chunk
        const sortedChunks = [...created.chunks].sort(
          (a, b) => a.chunkIndex - b.chunkIndex,
        );

        // Bygg en lista av (id, vector)-rader säkert med Prisma.sql
        const updates = sortedChunks.map(
          (chunk, index) =>
            Prisma.sql`(${chunk.id}, ${JSON.stringify(embeddings[index])}::vector)`,
        );

        // Kör en enda batch-UPDATE i databasen med VALUES
        await tx.$executeRaw`
          UPDATE "Chunk" AS c
          SET embedding = v.vec
          FROM (VALUES ${Prisma.join(updates)}) AS v(id, vec)
          WHERE c.id = v.id
        `;

        return created;
      },
      {
        timeout: 20000, // 20 sekunders timeout för stora dokument
      },
    );

    return {
      success: true,
      message: `Skapade dokument "${document.title}" med ${document.chunks.length} chunks och embeddings.`,
    };
  } catch (error) {
    console.error("Failed to upload document:", error);
    return {
      success: false,
      error: "Något gick fel vid uppladdningen. Försök igen.",
    };
  }
}
