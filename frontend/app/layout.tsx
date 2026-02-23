import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Contextly | Enterprise RAG Chatbots for Your Platform",
    template: "%s | Contextly",
  },
  description:
    "Build, embed, and monitor production RAG chatbots in minutes. Contextly handles ingestion, retrieval, auth, and observability for your AI applications.",
  keywords: [
    "contextly",
    "rag-chatbot",
    "embed chatbot",
    "chatbot knowledge",
    "AI assistant",
    "vector search",
    "LLM integration",
    "chatbot platform",
    "retrieval augmented generation",
  ],
  authors: [{ name: "Contextly Team" }],
  creator: "Contextly",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Contextly | Ship Intelligent Assistants",
    description:
      "A complete toolkit for building retrieval-augmented generation apps. Drop our pre-built widget into your frontend or use the API for full control.",
    url: SITE_URL,
    siteName: "Contextly",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "Contextly Platform Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contextly | Enterprise RAG Chatbots",
    description:
      "Build, embed, and monitor production RAG chatbots in minutes. Secure, scalable, and easy to integrate.",
    images: [absoluteUrl("/twitter-image")],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "theme-color": "#ffffff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={cn(
          "bg-background min-h-screen font-sans antialiased",
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
