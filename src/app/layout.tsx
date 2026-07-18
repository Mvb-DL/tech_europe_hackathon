import type { Metadata } from "next";
import { DemoPipelineProvider } from "@/demo/demo-pipeline-provider";
import "./globals.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "Proofline",
  description: "AI-assisted audit investigation workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DemoPipelineProvider>{children}</DemoPipelineProvider>
      </body>
    </html>
  );
}
