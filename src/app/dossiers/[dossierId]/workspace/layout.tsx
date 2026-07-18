import type { ReactNode } from "react";
import { WorkspaceShell } from "@/features/workspace/workspace-shell";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
