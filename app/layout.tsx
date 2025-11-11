import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import CloudflareWebAnalyticsProvider from 'next-cloudflare-web-analytics';

export const metadata: Metadata = {
  title: "EZLIST - Army List Formatter",
  description: "Convert Warhammer 40K army lists to easily readable format",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <CloudflareWebAnalyticsProvider token={'789ed2a4341d4c3086fade4820a5eff2'} />
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
