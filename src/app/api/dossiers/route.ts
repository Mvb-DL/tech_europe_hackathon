import { NextResponse } from "next/server";
import { PublicUploadError, uploadDossier } from "@/features/dossiers/services/dossier-upload-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UploadMetadata = {
  filename?: string;
  relativePath?: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const nameValue = formData.get("name");
    const metadata = JSON.parse(String(formData.get("metadata") ?? "[]")) as UploadMetadata[];
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File)
      .map((file, index) => {
        const item = metadata[index] ?? {};

        return Object.assign(file, {
          originalName: item.filename,
          relativePath: item.relativePath,
        });
      });
    const response = await uploadDossier({
      files,
      name: typeof nameValue === "string" ? nameValue : undefined,
    });

    return NextResponse.json(response, {
      status: response.acceptedFileIds.length > 0 ? 201 : 400,
    });
  } catch (error) {
    if (error instanceof PublicUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json(
      { error: "Dossier upload could not be completed." },
      { status: 400 },
    );
  }
}
