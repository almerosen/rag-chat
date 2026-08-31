import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
} from "ai";

import type { ChatUIMessage } from "@/types/chat";

import { openai } from "@ai-sdk/openai";

import { retrieveRelevantChunks } from "@/lib/retrieval";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: ChatUIMessage[] } = await req.json();

    const lastUserMessage = messages
      .filter((message) => message.role === "user")
      .at(-1);

    const query =
      lastUserMessage?.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") ?? "";

    if (!query.trim()) {
      return new Response("Ingen fråga angavs.", {
        status: 400,
      });
    }

    const relevantChunks = await retrieveRelevantChunks(query);

    if (relevantChunks.length === 0) {
      const stream = createUIMessageStream<ChatUIMessage>({
        execute: ({ writer }) => {
          const id = "no-context-response";

          writer.write({
            type: "text-start",
            id,
          });

          writer.write({
            type: "text-delta",
            id,
            delta:
              "Jag hittar ingen relevant information om det i dina uppladdade dokument. Ställ gärna en fråga som rör innehållet du laddat upp.",
          });

          writer.write({
            type: "text-end",
            id,
          });
        },
      });

      return createUIMessageStreamResponse({
        stream,
      });
    }

    const context = relevantChunks
      .map(
        (chunk, index) =>
          `[Källa ${index + 1}: ${chunk.documentTitle}]\n${chunk.content}`,
      )
      .join("\n\n");

    const systemPrompt = `Du är en assistent som ENDAST svarar baserat på informationen i användarens uppladdade dokument.

Regler:
- Använd endast information som uttryckligen finns i KONTEXTEN.
- Gissa aldrig.
- Använd inte extern kunskap för att fylla i information som saknas.
- Om svaret inte finns i KONTEXTEN, säg tydligt att informationen inte finns i de uppladdade dokumenten.
- Om informationen bara delvis finns i KONTEXTEN, svara endast på den del som stöds av dokumenten.
- Om dokumenten innehåller motstridig information, påpeka detta.
- Svara på samma språk som användaren.

KONTEXT:

${context}`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    const stream = createUIMessageStream<ChatUIMessage>({
      execute: ({ writer }) => {
        writer.write({
          type: "data-sources",
          id: "sources",
          data: relevantChunks.map((chunk) => ({
            documentId: chunk.documentId,
            documentTitle: chunk.documentTitle,
            similarity: chunk.similarity,
          })),
        });

        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            originalMessages: messages,
          }),
        );
      },

      onError: (error) => {
        console.error("Chat stream error:", error);

        return "Ett fel uppstod när svaret skulle genereras.";
      },
    });

    return createUIMessageStreamResponse({
      stream,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return new Response("Ett internt serverfel uppstod.", {
      status: 500,
    });
  }
}
