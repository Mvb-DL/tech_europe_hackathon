const productStages = [
  "File Upload",
  "File Mapping",
  "Entity Extraction",
  "Sub-Entity Setup",
  "Profile Building",
  "Profile Enrichment",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950 sm:px-10">
      <section className="mx-auto max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Tech Europe / Cortea Hackathon
        </p>
        <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
          Evidence-first audit investigation
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          A foundation for turning audit source files into traceable facts,
          profiles, and evidence-backed investigation outputs.
        </p>

        <div className="mt-8 border-l-4 border-emerald-600 bg-white p-5 shadow-sm">
          <p className="font-semibold text-slate-950">
            Next implementation step: File Upload
          </p>
          <p className="mt-2 text-slate-700">
            Upload, parsing, mapping, entity extraction, profiles, paths, and
            findings are intentionally out of scope for this foundation.
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-2xl font-semibold tracking-normal">
            Planned Product Stages
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {productStages.map((stage, index) => (
              <li
                className="flex items-center gap-4 rounded border border-slate-200 bg-white p-4 shadow-sm"
                key={stage}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-900 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="font-medium text-slate-900">{stage}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}
