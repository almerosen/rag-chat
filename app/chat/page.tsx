"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { ChatUIMessage } from "@/types/chat";

export default function ChatPage() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat<ChatUIMessage>();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!input.trim() || status !== "ready") {
      return;
    }

    sendMessage({
      text: input,
    });

    setInput("");
  }

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-4">Chatta med dina dokument</h1>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "self-end bg-black text-white p-3 rounded-lg max-w-[80%]"
                : "self-start bg-gray-100 text-black p-3 rounded-lg max-w-[80%]"
            }
          >
            <div>
              {message.parts
                .filter((p) => p.type === "text")
                .map((part, i) => (
                  <span key={i} className="whitespace-pre-wrap">
                    {part.text}
                  </span>
                ))}

              {message.parts
                .filter((p) => p.type === "data-sources")
                .map((part, i) => (
                  <div
                    key={i}
                    className="mt-3 pt-3 border-t border-gray-300 text-xs text-gray-600"
                  >
                    <p className="font-semibold mb-1">Källor:</p>
                    <ul className="space-y-0.5">
                      {part.data.map((source) => (
                        <li key={source.documentId}>
                          {source.documentTitle} (
                          {Math.round(source.similarity * 100)}% match)
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ställ en fråga om dina dokument..."
          className="flex-1 border p-2 rounded"
          disabled={isStreaming}
        />

        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {isStreaming ? "Svarar..." : "Skicka"}
        </button>
      </form>
    </main>
  );
}
