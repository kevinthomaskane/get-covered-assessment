'use server';

import { insertJob, submitUrlSchema } from '@app/shared';

type SubmitUrlResult =
  | { ok: true; jobId: number }
  | { ok: false; error: string };

export async function submitUrl(formData: FormData): Promise<SubmitUrlResult> {
  const raw = formData.get('url');
  const parsed = submitUrlSchema.safeParse({ url: raw });

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? 'Invalid URL';
    return { ok: false, error: first };
  }

  const job = insertJob(parsed.data.url);
  return { ok: true, jobId: job.id };
}
