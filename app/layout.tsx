// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LitLens — AI Book Recommendations",
  description: "LitLens — Personalized book recommendations powered by AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        {/* top-level wrapper so pages can rely on `.litlens-layout` */}
        <div className="min-h-screen litlens-layout bg-background text-foreground">
          {children}
        </div>
      </body>
    </html>
  );
}
