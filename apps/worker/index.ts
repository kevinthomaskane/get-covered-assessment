import { claimNextJob, completeJob, failJob, getDb } from "@app/shared/db";

const POLL_INTERVAL_MS = 1000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function processJob(jobId: number, url: string): Promise<void> {
  console.log(`[worker] processing job ${jobId}: ${url}`);
  // TODO Phase 3: Playwright render -> cheerio clean -> Claude detect.
  await sleep(500);
  completeJob(jobId, {
    snippet: `<!-- stub snippet for ${url} -->`,
    authType: "unknown",
    notes: "stub completion (Phase 2 wiring)",
  });
  console.log(`[worker] finished job ${jobId}`);
}

async function main() {
  getDb();
  console.log("[worker] started; polling for jobs");

  let running = true;
  const stop = () => {
    running = false;
    console.log("[worker] shutdown signal received");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  while (running) {
    const job = claimNextJob();
    if (job) {
      try {
        await processJob(job.id, job.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[worker] job ${job.id} threw: ${message}`);
        failJob(job.id, message);
      }
    } else {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  console.log("[worker] stopped");
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
