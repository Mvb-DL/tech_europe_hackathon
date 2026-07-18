import type { DocumentRole, PrimaryDomain } from "../domain/taxonomy";

export type FileMappingRule = {
  id: string; primaryDomain: PrimaryDomain; documentRole: DocumentRole; requiredHeaders?: string[];
  anyHeaders?: string[]; sheetPatterns?: RegExp[]; titlePatterns?: RegExp[]; filenamePatterns?: RegExp[];
  textPatterns?: RegExp[]; entityCandidates?: string[]; primaryKeyCandidates?: string[];
  joinKeyCandidates?: string[]; confidence: number; explanation: string;
};

export const fileMappingRules: FileMappingRule[] = [
  { id: "asset-master", primaryDomain: "fixed_assets", documentRole: "master_data", requiredHeaders: ["anlagennummer"], anyHeaders: ["anschaffungswert", "anlagegut", "asset"], primaryKeyCandidates: ["anlagennummer"], joinKeyCandidates: ["anlagennummer"], confidence: 0.95, explanation: "Observed fixed-asset master-data header signature." },
  { id: "asset-transactions", primaryDomain: "fixed_assets", documentRole: "transactions", requiredHeaders: ["anlagennummer"], anyHeaders: ["buchungsdatum", "betrag", "bewegung"], primaryKeyCandidates: ["anlagennummer"], joinKeyCandidates: ["anlagennummer"], confidence: 0.91, explanation: "Observed fixed-asset transaction header signature." },
  { id: "general-ledger", primaryDomain: "general_ledger", documentRole: "transactions", anyHeaders: ["sachkonto", "kontonummer", "buchungstext", "journal"], primaryKeyCandidates: ["belegnummer"], joinKeyCandidates: ["belegnummer", "sachkonto"], confidence: 0.88, explanation: "Observed general-ledger fields." },
  { id: "accounts-payable", primaryDomain: "accounts_payable", documentRole: "transactions", anyHeaders: ["kreditor", "lieferant", "vendor"], primaryKeyCandidates: ["kreditorennummer"], joinKeyCandidates: ["kreditorennummer", "belegnummer"], confidence: 0.84, explanation: "Observed supplier or payable fields." },
  { id: "accounts-receivable", primaryDomain: "accounts_receivable", documentRole: "transactions", anyHeaders: ["debitor", "kunde", "customer"], primaryKeyCandidates: ["debitorennummer"], joinKeyCandidates: ["debitorennummer", "belegnummer"], confidence: 0.84, explanation: "Observed customer or receivable fields." },
  { id: "permissions", primaryDomain: "controls_permissions", documentRole: "control_evidence", anyHeaders: ["berechtigung", "rolle", "user", "approval"], titlePatterns: [/berechtigung|freigabe|permission/i], confidence: 0.86, explanation: "Observed permissions or approval evidence." },
  { id: "financial-report", primaryDomain: "financial_reporting", documentRole: "financial_report", titlePatterns: [/bilanz|guv|jahresabschluss|balance sheet|income statement/i], filenamePatterns: [/bilanz|guv|jahresabschluss/i], confidence: 0.9, explanation: "Observed financial-report title." },
  { id: "schema-manifest", primaryDomain: "cross_domain_metadata", documentRole: "schema_manifest", titlePatterns: [/gdpdu|index|manifest|schema/i], filenamePatterns: [/index\.xml|\.dtd$/i], textPatterns: [/xml|schema|dtd/i], confidence: 0.93, explanation: "Observed XML or schema manifest markers." },
  { id: "audit-plan", primaryDomain: "audit_planning", documentRole: "audit_plan", titlePatterns: [/prüfungsplanung|audit plan/i], filenamePatterns: [/prüfungsplanung|audit.plan/i], confidence: 0.88, explanation: "Observed audit-planning marker." },
  { id: "corporate-structure", primaryDomain: "corporate_structure", documentRole: "supporting_document", anyHeaders: ["gesellschafter", "beteiligung"], filenamePatterns: [/gesellschafter|beteiligung/i], confidence: 0.86, explanation: "Observed corporate-structure marker." },
];
