"use client";

import { useState, useTransition } from "react";
import { submitUrl } from "@/app/actions";

interface SubmitFormProps {
  onSubmitted: () => void | Promise<void>;
}

export function SubmitForm({ onSubmitted }: SubmitFormProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitUrl(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl("");
      await onSubmitted();
    });
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-wrap items-center gap-2">
      <input
        type="url"
        name="url"
        placeholder="https://example.com/login"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        required
        disabled={pending}
        className="min-w-[280px] flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
