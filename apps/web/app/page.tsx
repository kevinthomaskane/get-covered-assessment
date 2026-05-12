import { listJobs } from "@app/shared";
import { JobsView } from "@/components/JobsView";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const initialJobs = listJobs();

  return (
    <main className="mx-auto max-w-3xl p-8 font-sans">
      <h1 className="text-2xl font-semibold">Auth Detector</h1>
      <p className="mt-1 text-sm text-gray-600">
        Submit a URL to scrape and identify its authentication component.
      </p>

      <JobsView initialJobs={initialJobs} />
    </main>
  );
}
