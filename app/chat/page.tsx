"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  }

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
            {message.parts.map((part, i) =>
              part.type === "text" ? <span key={i}>{part.text}</span> : null,
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ställ en fråga om dina dokument..."
          className="flex-1 border p-2 rounded"
          disabled={status === "streaming"}
        />
        <button
          type="submit"
          disabled={status === "streaming"}
          className="bg-black text-white px-4 py-2 rounded diabled:opacity-50"
        >
          Skicka
        </button>
      </form>
    </main>
  );
}
