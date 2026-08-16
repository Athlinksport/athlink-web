import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return { rules: [{ userAgent: "*", allow: ["/", "/terms", "/privacy", "/safety", "/contact"], disallow: ["/admin", "/api", "/dashboard", "/profile", "/rooms", "/messages", "/connections"] }], sitemap: `${base}/sitemap.xml` };
}
