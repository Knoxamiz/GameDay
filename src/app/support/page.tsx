import type { Metadata } from "next";
import PublicReleasePage from "../components/PublicReleasePage";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@gameday.app";

export const metadata: Metadata = {
  title: "Support | GameDay",
  description: "Get support for GameDay account, registration, team, and app access issues.",
};

export default function SupportPage() {
  return (
    <PublicReleasePage
      cta={{
        href: `mailto:${supportEmail}?subject=GameDay%20Support`,
        label: "Email support",
      }}
      eyebrow="Support"
      intro="Use support when sign-in, registration, team access, document upload, scheduling, roster, or account deletion workflows need help."
      sections={[
        {
          title: "What To Include",
          body: [
            "Include your account email, organization or team name, your role, the page where the issue happened, and what you expected to happen.",
            "Do not send passwords, Firebase tokens, private keys, payment secrets, or sensitive documents through normal support email unless GameDay provides a secure upload path.",
          ],
        },
        {
          title: "Common Paths",
          body: [
            "Parents can use Find registration when joining a team. Coaches can create a free team or use the email their organization invited. Admins can open their account and choose a verified organization or team workspace.",
            "If a workspace made with a different email does not appear, sign in with the original owner email or ask an owner/admin to invite the correct email as an organization member.",
          ],
        },
        {
          title: "Account Deletion",
          body: [
            "Signed-in users can request account deletion from the delete-account page. GameDay records the request against the verified account session.",
            "Support may need to preserve required operational, legal, safety, or transaction records while removing or anonymizing personal account data.",
          ],
        },
      ]}
      title="GameDay Support"
    />
  );
}
