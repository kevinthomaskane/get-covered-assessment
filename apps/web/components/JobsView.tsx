"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Job } from "@app/shared";
import { SubmitForm } from "./SubmitForm";
import { JobRow } from "./JobRow";

const POLL_INTERVAL_MS = 1500;

function hasActiveJob(jobs: Job[]): boolean {
  return jobs.some(
    (j) => j.status === "pending" || j.status === "processing",
  );
}

export function JobsView({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    intervalRef.current = setInterval(async () => {
      const res = await fetch("/api/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { jobs: Job[] };
      setJobs(data.jobs);
      if (!hasActiveJob(data.jobs)) stopPolling();
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  useEffect(() => {
    if (hasActiveJob(jobs)) startPolling();
    return stopPolling;
    // Mount-only: subsequent restarts are driven by submit, and the interval
    // self-clears when no active jobs remain in a fetch response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <SubmitForm onSubmitted={startPolling} />

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
