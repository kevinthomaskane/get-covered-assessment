"use client";

import { useCallback, useEffect, useState } from "react";
import type { Job } from "@app/shared";
import { SubmitForm } from "./SubmitForm";
import { JobRow } from "./JobRow";

const POLL_INTERVAL_MS = 1500;

export function JobsView({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { jobs: Job[] };
    setJobs(data.jobs);
  }, []);

  useEffect(() => {
    const id = setInterval(fetchJobs, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchJobs]);

  return (
    <>
      <SubmitForm onSubmitted={fetchJobs} />

      <h2 className="mt-8 text-lg font-medium">Jobs ({jobs.length})</h2>
      {jobs.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No jobs yet. Submit a URL above.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {jobs.map((j) => (
            <JobRow key={j.id} job={j} />
          ))}
        </ul>
      )}
    </>
  );
}
