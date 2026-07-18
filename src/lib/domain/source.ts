export type SourceId = string;

export type SourceReference = {
  fileId: SourceId;
  dossierId?: string;
  filename: string;
  sha256?: string;
  sheet?: string;
  page?: number;
  row?: number;
  column?: string;
  passage?: string;
};

export type SourcedValueStatus = "observed" | "derived" | "inferred";

export type SourcedValue<T> = {
  value: T;
  status: SourcedValueStatus;
  sources: SourceReference[];
  confidence: number;
};
