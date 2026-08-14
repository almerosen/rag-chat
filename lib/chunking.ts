interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
}

export function chunkText(
  text: string,
  { chunkSize = 800, overlap = 150 }: ChunkOptions = {},
): string[] {
  const separators = ["\n\n", "\n", ". ", " "];
  return splitRecursively(text.trim(), separators, chunkSize, overlap);
}

function splitRecursively(
  text: string,
  separators: string[],
  chunkSize: number,
  overlap: number,
): string[] {
  if (text.length <= chunkSize) {
    return text.length > 0 ? [text] : [];
  }

  const [separator, ...restSeparators] = separators;

  if (!separator) {
    // Sista utväg: klipp rakt av
    return hardSplit(text, chunkSize, overlap);
  }

  const parts = text.split(separator).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const part of parts) {
    const candidate = current ? current + separator + part : part;

    if (candidate.length <= chunkSize) {
      current = candidate;
    } else {
      if (current) chunks.push(current);

      if (part.length > chunkSize) {
        chunks.push(
          ...splitRecursively(part, restSeparators, chunkSize, overlap),
        );
        current = "";
      } else {
        current = part;
      }
    }
  }

  if (current) chunks.push(current);

  return addOverlap(chunks, overlap);
}

function hardSplit(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }

  return chunks;
}

function addOverlap(chunks: string[], overlap: number): string[] {
  if (chunks.length <= 1) return chunks;

  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prevTail = chunks[i - 1].slice(-overlap);
    return prevTail + chunk;
  });
}
