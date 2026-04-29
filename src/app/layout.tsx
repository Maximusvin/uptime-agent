import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "UptimeAgent — Моніторинг сайтів",
  description:
    "Моніторинг доступності сайтів 24/7. Telegram-сповіщення, SEO аналіз, щоденні звіти.",
  keywords: ["uptime", "monitor", "website", "telegram", "seo", "моніторинг"],
  openGraph: {
    title: "UptimeAgent — Моніторинг сайтів",
    description: "Моніторинг доступності сайтів 24/7",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={inter.variable}>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1a1a2e",
              color: "#e2e8f0",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
