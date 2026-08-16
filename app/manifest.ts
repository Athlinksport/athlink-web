import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Athlink", short_name: "Athlink", description: "Connect with athletes and sports communities.", start_url: "/", display: "standalone", background_color: "#020617", theme_color: "#a3e635", icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }] };
}
