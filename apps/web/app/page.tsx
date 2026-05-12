import { listJobs } from "@app/shared";
import { SubmitForm } from "./SubmitForm";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const jobs = listJobs();

  return (
    <main className="mx-auto max-w-3xl p-8 font-sans">
      <h1 className="text-2xl font-semibold">Auth Detector</h1>
      <p className="mt-1 text-sm text-gray-600">
        Submit a URL to scrape and identify its authentication component.
      </p>

      <SubmitForm />

      <h2 className="mt-8 text-lg font-medium">Jobs ({jobs.length})</h2>
      {jobs.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">No jobs yet.</p>
      ) : (
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-left text-sm text-gray-600">
              <th className="p-2 font-medium">ID</th>
              <th className="p-2 font-medium">URL</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-gray-100 text-sm">
                <td className="p-2">{j.id}</td>
                <td className="p-2 font-mono text-xs">{j.url}</td>
                <td className="p-2">{j.status}</td>
                <td className="p-2">{j.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-4 text-xs text-gray-500">
        (Phase 2 smoke view — refresh to see updates. Polling UI comes in Phase 4.)
      </p>
    </main>
  );
}
