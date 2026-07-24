import type { NextConfig } from "next";

function getSupabaseImagePattern() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const parsedUrl = new URL(supabaseUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return null;

    return {
      protocol: parsedUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const supabaseImagePattern = getSupabaseImagePattern();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseImagePattern
      ? [
          supabaseImagePattern,
          { ...supabaseImagePattern, pathname: "/storage/v1/object/sign/**" },
        ]
      : [],
  },
};

export default nextConfig;
