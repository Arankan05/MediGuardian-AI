import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MediGuardian AI — Medical Report & Prescription Cross-Checker",
  description:
    "Turns scattered prescriptions, lab reports and doctor notes into one connected, AI-reasoned medical timeline — catching duplicate medicines, dosage conflicts, allergy contradictions and lab trends across visits.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans bg-background text-foreground antialiased min-h-screen`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Page chrome is owned by each section: the landing page renders its own
              marketing header, the dashboard renders its own sidebar + topbar. */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
