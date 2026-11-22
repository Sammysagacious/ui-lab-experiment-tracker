import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI LabTrack | Faculty of Science Experiment & Sample Tracker",
  description:
    "Laboratory Experiment Tracking System for Biological and Physical Sciences Research — Faculty of Science, University of Ibadan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}