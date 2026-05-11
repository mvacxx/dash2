import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Dashzada ROI",
  description: "Base SaaS para dashboards multiusuário de ROI de campanhas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
