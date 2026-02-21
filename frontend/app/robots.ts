import { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/api/",
                "/projects",
                "/projects/",
                "/billing",
                "/billing/",
                "/widget",
                "/widget/",
            ],
        },
        sitemap: absoluteUrl("/sitemap.xml"),
    };
}
