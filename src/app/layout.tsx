import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backend Java/Kotlin Recruiter Dashboard — AI-Assisted Technical Hiring",
  description: "Portfolio demo: AI-powered technical recruiter platform for sourcing, assessing, and hiring backend Java and Kotlin engineers. Pipeline analytics, skills matching, and candidate management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
