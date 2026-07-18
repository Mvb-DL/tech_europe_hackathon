import type { Metadata } from "next";
import { DemoPipelineProvider } from "@/demo/demo-pipeline-provider";
import "./globals.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "Tech Europe / Cortea Hackathon",
  description: "Evidence-first audit investigation foundation.",
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
