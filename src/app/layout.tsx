import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
