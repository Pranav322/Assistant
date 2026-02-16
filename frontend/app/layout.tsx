import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

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
  metadataBase: new URL("https://contextly.live"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Contextly | Ship Intelligent Assistants",
    description:
      "A complete toolkit for building retrieval-augmented generation apps. Drop our pre-built widget into your frontend or use the API for full control.",
    url: "https://contextly.live",
    siteName: "Contextly",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png", // We should create this or use a default if available, users often forget
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
    creator: "@contextly_ai", // Placeholder or if user has one
    images: ["/og-image.png"],
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
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
