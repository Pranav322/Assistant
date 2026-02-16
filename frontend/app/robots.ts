import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/", "/dashboard/", "/settings/"], // Protect internal routes if needed, though auth handles this
        },
        sitemap: "https://contextly.live/sitemap.xml",
    };
}
