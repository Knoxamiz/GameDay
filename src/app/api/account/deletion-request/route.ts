import { NextResponse } from "next/server";
import { createAccountDeletionRequest } from "../../../data/accountDeletionRequests.server";
import { getCurrentAuthSession } from "../../../data/currentUser.server";

export const runtime = "nodejs";

export async function POST() {
  const session = await getCurrentAuthSession();

  if (!session) {
    return NextResponse.json(
      { error: "Sign in before requesting account deletion." },
      { status: 401 },
    );
  }

  try {
    const request = await createAccountDeletionRequest(session);

    return NextResponse.json({
      requestId: request.id,
      status: "ok",
    });
  } catch (error) {
    console.warn("Account deletion request failed.", {
      message: error instanceof Error ? error.message : "Unknown error",
      name: error instanceof Error ? error.name : typeof error,
      uid: session.user.id,
    });

    return NextResponse.json(
      { error: "Could not create account deletion request." },
      { status: 500 },
    );
  }
}
