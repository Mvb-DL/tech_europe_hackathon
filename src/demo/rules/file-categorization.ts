import type { UploadedFile } from "@/lib/pipeline/contracts";

export type DemoFileCategory = {
  id: string;
  title: string;
};

type CategoryRule = DemoFileCategory & {
  keywords: string[];
};

const categoryRules: CategoryRule[] = [
  {
    id: "general-ledger",
    title: "General Ledger",
    keywords: ["sachkonto", "ledger", "journal", "account"],
  },
  {
    id: "subledgers",
    title: "Subledgers",
    keywords: [
      "debitor",
      "kreditor",
      "customer",
      "vendor",
      "supplier",
      "receivable",
      "payable",
    ],
  },
  {
    id: "assets",
    title: "Assets",
    keywords: ["anlage", "asset", "fixed"],
  },
  {
    id: "controls",
    title: "Controls",
    keywords: ["control", "audit", "log", "berechtigung", "approval"],
  },
  {
    id: "financial-reporting",
    title: "Financial Reporting",
    keywords: ["bilanz", "guv", "report", "salden", "balance"],
  },
  {
    id: "supporting-documents",
    title: "Supporting Documents",
    keywords: ["invoice", "plan", "document", "note", "contract"],
  },
];

const fallbackCategory: DemoFileCategory = {
  id: "other",
  title: "Other",
};

export function categorizeDemoFile(file: UploadedFile): DemoFileCategory {
  const candidate = `${file.filename} ${file.extension}`.toLowerCase();
  const matchedRule = categoryRules.find((rule) =>
    rule.keywords.some((keyword) => candidate.includes(keyword)),
  );

  return matchedRule
    ? { id: matchedRule.id, title: matchedRule.title }
    : fallbackCategory;
}
