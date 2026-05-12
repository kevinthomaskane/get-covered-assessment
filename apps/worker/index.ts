import { claimNextJob, completeJob, failJob, getDb } from "@app/shared";
import { renderPage, shutdownBrowser } from "./playwright";
import { cleanHtml } from "./clean";
import { detectAuthComponent } from "./detect";

const POLL_INTERVAL_MS = 1000;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function processJob(jobId: number, url: string): Promise<void> {
  console.log(`[worker] job ${jobId} processing: ${url}`);

  const rawHtml = await renderPage(url);
  const { html, tier } = cleanHtml(rawHtml);
  console.log(
    `[worker] job ${jobId} cleaned: ${html.length} chars (tier ${tier})`,
  );

  const result = await detectAuthComponent(html);
  completeJob(jobId, result);
  console.log(
    `[worker] job ${jobId} done: authType=${result.authType}, snippet=${result.snippet ? `${result.snippet.length} chars` : "null"}`,
  );
}

async function main() {
  getDb();
  console.log("[worker] started; polling for jobs");

  let running = true;
  const stop = async () => {
    if (!running) return;
    running = false;
    console.log("[worker] shutdown signal received");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    while (running) {
      const job = claimNextJob();
      if (job) {
        try {
          await processJob(job.id, job.url);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[worker] job ${job.id} failed: ${message}`);
          failJob(job.id, message);
        }
      } else {
        await sleep(POLL_INTERVAL_MS);
      }
    }
  } finally {
    await shutdownBrowser();
    console.log("[worker] stopped");
  }
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
