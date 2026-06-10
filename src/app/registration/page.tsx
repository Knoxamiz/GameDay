import JoinRegistrationFlow from "../components/JoinRegistrationFlow";
import MvpNav from "../components/MvpNav";
import RegistrationPreviewFlow from "../components/RegistrationPreviewFlow";
import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import {
  getRegistrationInviteContext,
  registrationInvites,
} from "../data/invites";

export const dynamic = "force-dynamic";

export default function RegistrationHome() {
  const primaryInvite = registrationInvites[0];
  const liveRegistrationEnabled = Boolean(getFirebaseAdminConfig());
  const { organization, team } = primaryInvite
    ? getRegistrationInviteContext(primaryInvite)
    : { organization: undefined, team: undefined };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        {liveRegistrationEnabled && primaryInvite ? (
          <JoinRegistrationFlow
            invite={primaryInvite}
            organization={organization}
            team={team}
          />
        ) : (
          <RegistrationPreviewFlow primaryInvite={primaryInvite} />
        )}
      </section>
    </main>
  );
}
