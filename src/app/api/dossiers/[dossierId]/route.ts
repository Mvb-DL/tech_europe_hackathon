import { NextResponse } from "next/server";
import { createFilesystemDossierRepository } from "@/features/dossiers/repositories/dossier-repository";
import { assertSafeIdentifier } from "@/features/dossiers/storage/source-file-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ dossierId: string }> }) {
  const { dossierId } = await params;

  try {
    assertSafeIdentifier(dossierId, "dossier identifier");
  } catch {
    return NextResponse.json({ error: "Invalid dossier identifier." }, { status: 400 });
  }

  const repository = createFilesystemDossierRepository();
  const dossier = await repository.getById(dossierId);

  if (!dossier) {
    return NextResponse.json({ error: "Dossier not found." }, { status: 404 });
  }

  return NextResponse.json({ dossier });
}
