import { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const indexablePaths = [
    "/",
    "/rag-chatbot-from-documents",
    "/docs/getting-started",
    "/docs/getting-started/quickstart",
    "/docs/platform",
    "/docs/platform/projects",
    "/docs/platform/widget",
    "/docs/platform/api-keys",
    "/docs/platform/analytics",
    "/docs/self-hosting",
    "/docs/self-hosting/installation",
    "/docs/self-hosting/configuration",
    "/docs/self-hosting/architecture",
    "/docs/self-hosting/docker",
    "/docs/self-hosting/production",
  ] as const;

  return indexablePaths.map((path) => ({
    url: path === "/" ? SITE_URL : absoluteUrl(path),
    changeFrequency: path.startsWith("/docs/") ? "monthly" : "weekly",
    priority: path === "/" ? 1 : path === "/rag-chatbot-from-documents" ? 0.9 : 0.8,
  }));
}
