"use client";

import { useActionState } from "react";
import { uploadDocument, type UploadState } from "./actions";

const initialState: UploadState = null;

export default function DocumentPage() {
  const [state, formAction, isPending] = useActionState(
    uploadDocument,
    initialState,
  );

  return (
    <main className="max-w-2xl mx-auto p-8">
      <h1 className="test-2xl font-bold mb-4 ">Ladda upp dokument</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input
          name="title"
          placeholder="Titel"
          className="border p-2 rounded"
          required
        />
        <textarea
          name="content"
          placeholder="Klistra in text här..."
          rows={10}
          className="border p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={isPending}
          className="bg-black text-white p-2 rounded hover:cursor-pointer disabled:opacity-50"
        >
          {isPending ? "Laddar upp..." : "Ladda upp"}
        </button>
      </form>

      {state?.success === true && (
        <p className="mt-4 text-green-700">{state.message}</p>
      )}

      {state?.success === false && (
        <p className="mt-4 text-red-700">{state.error}</p>
      )}
    </main>
  );
}
