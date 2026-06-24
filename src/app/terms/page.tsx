import type { Metadata } from "next";
import PublicReleasePage from "../components/PublicReleasePage";

export const metadata: Metadata = {
  title: "Terms | GameDay",
  description: "GameDay account and youth sports workspace terms.",
};

export default function TermsPage() {
  return (
    <PublicReleasePage
      cta={{ href: "/signup", label: "Open GameDay" }}
      eyebrow="Terms"
      intro="These release terms describe the intended operating rules for GameDay accounts, organizations, teams, coaches, parents, and players. Final legal review is still required before public launch."
      sections={[
        {
          title: "Use Of GameDay",
          body: [
            "GameDay is for youth sports organization, team, roster, registration, schedule, document, attendance, and communication workflows.",
            "Users are responsible for providing accurate registration, roster, contact, schedule, and organization information.",
          ],
        },
        {
          title: "Account Roles",
          body: [
            "Admins and owners manage organization or team workspaces only when their account has verified access. Coaches access assigned team workflows. Parents access player and registration workflows tied to their account.",
            "Role switching shortcuts, impersonation, and unscoped access are not production behavior.",
          ],
        },
        {
          title: "Payments And Premium Features",
          body: [
            "Organization billing, payment collection, ride share, scoreboard, and open chat features should not be treated as final production commitments until those systems are implemented and compliance-reviewed.",
            "GameDay may offer different capabilities for paid organizations, free single teams, coaches, and parents.",
          ],
        },
        {
          title: "Safety And Operations",
          body: [
            "GameDay is an operations tool. Coaches, admins, parents, and organizations remain responsible for real-world player safety, emergency decisions, field conditions, league rules, and legal obligations.",
            "Accounts that misuse access, submit false data, or interfere with other organizations may be suspended or removed.",
          ],
        },
      ]}
      title="GameDay Terms"
    />
  );
}
