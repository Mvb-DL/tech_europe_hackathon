import { NextResponse } from "next/server";
import { mapDossier } from "@/features/file-mapping/services/map-dossier";
import { getMapping } from "@/features/file-mapping/repositories/file-map-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ dossierId: string }> }) {
  try { const { dossierId } = await params; return NextResponse.json(await mapDossier(dossierId)); }
  catch { return NextResponse.json({ error: "Mapping could not be completed." }, { status: 404 }); }
}
export async function GET(_: Request, { params }: { params: Promise<{ dossierId: string }> }) {
  try { const { dossierId } = await params; const mapping = await getMapping(dossierId); return mapping ? NextResponse.json(mapping) : NextResponse.json({ error: "Mapping not found." }, { status: 404 }); }
  catch { return NextResponse.json({ error: "Mapping not found." }, { status: 404 }); }
}
