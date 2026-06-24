import type { Metadata } from "next";
import PublicReleasePage from "../components/PublicReleasePage";

export const metadata: Metadata = {
  title: "Privacy | GameDay",
  description: "How GameDay handles youth sports account and team data.",
};

export default function PrivacyPage() {
  return (
    <PublicReleasePage
      cta={{ href: "/support", label: "Contact support" }}
      eyebrow="Privacy"
      intro="GameDay stores the information needed to run youth sports teams, registrations, schedules, messages, and player readiness. This page is the release policy surface that will be reviewed before public app-store submission."
      sections={[
        {
          title: "Information GameDay Uses",
          body: [
            "GameDay may use account identifiers, email addresses, organization memberships, coach assignments, parent/player registrations, roster details, emergency/contact fields, schedule responses, transportation choices, uploaded registration documents, and team or organization messages.",
            "Payment fields are represented in the product model, but real payment collection should remain disabled until the payment provider and app-store compliance path are finalized.",
          ],
        },
        {
          title: "Why The Data Is Used",
          body: [
            "Data is used to show each signed-in person only the organization, team, player, schedule, roster, registration, document, message, and attendance context they are allowed to access.",
            "GameDay does not need broad public lists of teams or unscoped organization data for the core parent, coach, or admin experience.",
          ],
        },
        {
          title: "Storage And Access",
          body: [
            "Production app data is backed by Firebase Auth, Firestore, and Firebase Storage. Protected mutations are intended to go through verified server routes.",
            "Access is scoped by Firebase session, organization membership, coach assignment, parent ownership, registration, team, and organization identifiers.",
          ],
        },
        {
          title: "Deletion And Support",
          body: [
            "Signed-in users can start an account deletion request from the GameDay delete-account page. GameDay should remove or anonymize account data that is not required for legal, safety, transaction, or operational records.",
            "Before public release, this policy should be reviewed against the final data collected, App Store privacy labels, and any youth-sports or child-privacy requirements that apply to the launch market.",
          ],
        },
      ]}
      title="GameDay Privacy"
    />
  );
}
