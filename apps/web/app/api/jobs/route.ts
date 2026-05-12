import { NextResponse } from "next/server";
import { listJobs } from "@app/shared";

export const dynamic = "force-dynamic";

export function GET() {
  const jobs = listJobs();
  return NextResponse.json({ jobs });
}
