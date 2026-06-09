import type { MetadataRoute } from "next";
import { athletes } from "./data/athletes";
import { events } from "./data/events";
import { registrationInvites } from "./data/invites";
import { teams } from "./data/teams";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const staticRoutes = [
    "",
    "/parent",
    "/coach",
    "/admin",
    "/admin/registrations",
    "/events",
    "/registration",
    "/teams",
  ];
  const dynamicRoutes = [
    ...athletes.map((athlete) => `/athletes/${athlete.id}`),
    ...events.map((event) => `/events/${event.id}`),
    ...registrationInvites.map((invite) => invite.inviteUrl),
    ...teams.map((team) => `/teams/${team.id}`),
  ];

  return [...staticRoutes, ...dynamicRoutes].map((route) => ({
    lastModified: new Date(),
    url: `${baseUrl}${route}`,
  }));
}
