import { NextResponse } from "next/server";
import { accessRoles, authReadiness } from "../../data/accessControl";
import { athletes } from "../../data/athletes";
import {
  backendCollections,
  betaPersistenceReadiness,
} from "../../data/backendSchema";
import { documentRequirements } from "../../data/documents";
import { events } from "../../data/events";
import { organizations } from "../../data/organizations";
import { parents } from "../../data/parents";
import { paymentRequirements } from "../../data/payments";
import { registrations } from "../../data/registrations";
import { teams } from "../../data/teams";
import { getInfrastructureEnvStatus } from "../../infrastructure/env";
import { getFirebaseWiringStatus } from "../../infrastructure/firebaseReadiness";

export const runtime = "nodejs";

export async function GET() {
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
