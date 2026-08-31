import type { UIMessage } from "ai";

export interface Source {
  documentId: string;
  documentTitle: string;
  similarity: number;
}

export type ChatUIMessage = UIMessage<
  never,
  {
    sources: Source[];
  }
>;
