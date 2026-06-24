import { NextRequest, NextResponse } from "next/server";
import { accessRoles, authReadiness } from "../../data/accessControl";
import { athletes } from "../../data/athletes";
import {
  backendCollections,
  betaPersistenceReadiness,
} from "../../data/backendSchema";
import { documentRequirements } from "../../data/documents";
import { events } from "../../data/events";
import { organizationMemberships } from "../../data/organizationMemberships";
import { organizations } from "../../data/organizations";
import { parents } from "../../data/parents";
import { paymentRequirements } from "../../data/payments";
import { registrations } from "../../data/registrations";
import { teams } from "../../data/teams";
import { getInfrastructureEnvStatus } from "../../infrastructure/env";
import { getFirebaseWiringStatus } from "../../infrastructure/firebaseReadiness";

export const runtime = "nodejs";

function isDetailedHealthRequest(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const token = process.env.HEALTH_DIAGNOSTIC_TOKEN?.trim();

  return Boolean(
    token && request.headers.get("x-gameday-health-token") === token,
  );
}

export async function GET(request: NextRequest) {
  if (!isDetailedHealthRequest(request)) {
    return NextResponse.json({
      app: "GameDay",
      diagnostics: "restricted",
      status: "ok",
    });
  }

  return NextResponse.json({
    app: "GameDay",
    auth: {
      mode: authReadiness.currentMode,
      roles: accessRoles.map((role) => role.role),
    },
    backendMode: betaPersistenceReadiness.backendMode,
    collections: backendCollections,
    counts: {
      athletes: athletes.length,
      documentRequirements: documentRequirements.length,
      events: events.length,
      organizationMemberships: organizationMemberships.length,
      organizations: organizations.length,
      parents: parents.length,
      paymentRequirements: paymentRequirements.length,
      registrations: registrations.length,
      teams: teams.length,
    },
    infrastructure: getInfrastructureEnvStatus(),
    firebase: await getFirebaseWiringStatus(),
    status: "ok",
  });
}
