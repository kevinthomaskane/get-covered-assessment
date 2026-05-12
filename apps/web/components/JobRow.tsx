"use client";

import { useState } from "react";
import type { Job, AuthType } from "@app/shared";

const STATUS_STYLES: Record<Job["status"], string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const AUTH_TYPE_STYLES: Record<AuthType, string> = {
  password: "bg-purple-100 text-purple-700",
  "magic-link": "bg-amber-100 text-amber-700",
  sso: "bg-indigo-100 text-indigo-700",
  oauth: "bg-pink-100 text-pink-700",
  "multi-step": "bg-teal-100 text-teal-700",
  unknown: "bg-gray-100 text-gray-700",
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts.replace(" ", "T") + "Z");
  return d.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }) + " UTC";
}

export function JobRow({ job }: { job: Job }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    if (!job.html_snippet) return;
    await navigator.clipboard.writeText(job.html_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="overflow-hidden rounded border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
      >
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}
        >
          {job.status}
        </span>
        <span className="flex-1 truncate font-mono text-sm">{job.url}</span>
        <span className="hidden text-xs text-gray-500 sm:inline">
          {formatTimestamp(job.created_at)}
        </span>
        <span
          className={`inline-block text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-200 bg-gray-50/50 p-4">
          {job.status === "completed" && job.html_snippet && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {job.auth_type && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      AUTH_TYPE_STYLES[job.auth_type] ?? AUTH_TYPE_STYLES.unknown
                    }`}
                  >
                    {job.auth_type}
                  </span>
                )}
                <button
                  type="button"
                  onClick={copySnippet}
                  className="ml-auto rounded border border-gray-300 bg-white px-2 py-0.5 text-xs hover:bg-gray-100"
                >
                  {copied ? "Copied" : "Copy snippet"}
                </button>
              </div>
              {job.notes && (
                <p className="mb-3 text-sm text-gray-700">{job.notes}</p>
              )}
              <pre className="max-h-96 overflow-auto rounded border border-gray-200 bg-white p-3 font-mono text-xs leading-relaxed">
                {job.html_snippet}
              </pre>
            </>
          )}

          {job.status === "completed" && !job.html_snippet && (
            <>
              <p className="text-sm font-medium text-gray-700">
                No authentication component found on this page.
              </p>
              {job.notes && (
                <p className="mt-1 text-sm text-gray-600">{job.notes}</p>
              )}
            </>
          )}

          {job.status === "failed" && (
            <p className="text-sm text-red-700">
              {job.error ?? "Unknown error"}
            </p>
          )}

          {(job.status === "pending" || job.status === "processing") && (
            <p className="text-sm text-gray-500">
              {job.status === "pending"
                ? "Waiting for a worker to claim this job…"
                : "Rendering the page and detecting the auth component…"}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
