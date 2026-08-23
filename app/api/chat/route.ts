import { streamText, type UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveRelevantChunks } from "@/lib/retrieval";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const lastUserMessage = messages.filter((m) => m.role === "user").at(-1);

  const query =
    lastUserMessage?.parts
      ?.map((p) => (p.type === "text" ? p.text : ""))
      .join("") ?? "";

  // Kör bara retrieval om det faktiskt finns en söktext
  const relevantChunks = query.trim()
    ? await retrieveRelevantChunks(query)
    : [];

  const context =
    relevantChunks.length > 0
      ? relevantChunks
          .map((c, i) => `[Källa ${i + 1}: ${c.documentTitle}]\n${c.content}`)
          .join("\n\n")
      : null;

  const systemPrompt = context
    ? `Du är en hjälpsam assistent som svarar baserat på följande kontext från användarens uppladdade dokument. Om svaret inte finns i kontexten, säg det tydligt istället för att gissa.\n\nKontext:\n${context}`
    : `Du är en hjälpsam assistent. Inga relevanta dokument hittades för den här frågan, så informera användaren om det och svara generellt om möjligt.`;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
