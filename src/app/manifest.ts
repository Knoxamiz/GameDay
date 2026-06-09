import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#020617",
    categories: ["sports", "productivity"],
    description: "Youth sports logistics for families, coaches, and admins.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "256x256",
        src: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    name: "GameDay",
    orientation: "portrait",
    scope: "/",
    short_name: "GameDay",
    start_url: "/",
    theme_color: "#020617",
  };
}
