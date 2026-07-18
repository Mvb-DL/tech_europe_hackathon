export type SourceReference = {
  fileId: string;
  filename: string;
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
