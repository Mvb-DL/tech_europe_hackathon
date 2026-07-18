export const primaryDomains = [
  "general_ledger", "accounts_payable", "accounts_receivable", "fixed_assets",
  "controls_permissions", "financial_reporting", "audit_planning",
  "corporate_structure", "cross_domain_metadata", "supporting_documents", "unknown",
] as const;
export type PrimaryDomain = (typeof primaryDomains)[number];

export const documentRoles = [
  "master_data", "transactions", "reconciliation", "financial_report",
  "control_evidence", "schema_manifest", "export_manifest", "audit_plan",
  "supporting_document", "unknown",
] as const;
export type DocumentRole = (typeof documentRoles)[number];

export const domainLabels: Record<PrimaryDomain, string> = {
  general_ledger: "General ledger", accounts_payable: "Accounts payable",
  accounts_receivable: "Accounts receivable", fixed_assets: "Fixed assets",
  controls_permissions: "Controls & permissions", financial_reporting: "Financial reporting",
  audit_planning: "Audit planning", corporate_structure: "Corporate structure",
  cross_domain_metadata: "Cross-domain metadata", supporting_documents: "Supporting documents",
  unknown: "Unknown",
};

export function isPrimaryDomain(value: unknown): value is PrimaryDomain {
  return typeof value === "string" && primaryDomains.includes(value as PrimaryDomain);
}

export function isDocumentRole(value: unknown): value is DocumentRole {
  return typeof value === "string" && documentRoles.includes(value as DocumentRole);
}
