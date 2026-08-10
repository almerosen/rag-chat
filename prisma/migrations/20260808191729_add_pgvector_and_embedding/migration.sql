-- Aktivera pgvector-extensionen
CREATE EXTENSION IF NOT EXISTS vector;

-- Lägg till embedding-kolumnen på Chunk
ALTER TABLE "Chunk" ADD COLUMN "embedding" vector(1536);