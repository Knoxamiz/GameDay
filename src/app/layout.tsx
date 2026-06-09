import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "GameDay",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GameDay",
  },
  title: "GameDay",
  description: "Youth sports logistics for families, coaches, and admins.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    description: "Youth sports logistics for families, coaches, and admins.",
    siteName: "GameDay",
    title: "GameDay",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#020617",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
