import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://contextly.live").replace(
  /\/+$/,
  ""
);

export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function buildPageMetadata({ title, description, path }: BuildPageMetadataInput): Metadata {
  const canonical = path === "/" ? SITE_URL : absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Contextly",
      type: "website",
      images: [absoluteUrl("/opengraph-image")],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/twitter-image")],
    },
  };
}
