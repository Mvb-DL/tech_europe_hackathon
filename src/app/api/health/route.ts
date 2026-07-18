import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export type HealthResponse = {
  status: "ok";
  service: "tech-europe-hackathon";
  timestamp: string;
};

export function GET() {
  const response: HealthResponse = {
    status: "ok",
    service: "tech-europe-hackathon",
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
