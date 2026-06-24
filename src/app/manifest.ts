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
        sizes: "any",
        src: "/icons/gameday-icon.svg",
        type: "image/svg+xml",
      },
      {
        purpose: "maskable",
        sizes: "any",
        src: "/icons/gameday-maskable.svg",
        type: "image/svg+xml",
      },
      {
        purpose: "any",
        sizes: "256x256",
        src: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
    id: "/",
    name: "GameDay",
    orientation: "portrait",
    scope: "/",
    short_name: "GameDay",
    shortcuts: [
      {
        description: "Search for a team or enter an invite code.",
        name: "Find registration",
        short_name: "Register",
        url: "/registration",
      },
      {
        description: "Open your verified GameDay workspace.",
        name: "Open account",
        short_name: "Account",
        url: "/account",
      },
    ],
    start_url: "/",
    theme_color: "#020617",
  };
}
