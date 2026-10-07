import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegister from "@/components/sw-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
import "./globals.css";

export const metadata: Metadata = {
  title: "Automation Academy | Your learning workspace",
  description: "A focused course in production automation, applied AI, and interview preparation.",
  referrer: "strict-origin-when-cross-origin",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  appleWebApp: { capable: true, title: "Academy", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2855e8",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
