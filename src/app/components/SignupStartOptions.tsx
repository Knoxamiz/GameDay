"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createFirebaseUserWithEmailPassword } from "../infrastructure/firebaseClientAuth";

export type SignupIntent = "organization" | "parent" | "team";

type SignupStartOptionsProps = {
  initialIntent?: SignupIntent;
  isSignedIn: boolean;
};

type WorkspaceCreateResponse = {
  error?: string;
  id?: string;
  message?: string;
  organizationId?: string;
  teamId?: string;
};

const intentCards: Array<{
  description: string;
  intent: SignupIntent;
  label: string;
  plan: string;
  title: string;
}> = [
  {
    description:
      "Create a multi-team organization, invite staff, manage teams, and unlock paid organization tools.",
    intent: "organization",
    label: "Admin creates",
    plan: "Paid organization",
    title: "Organization",
  },
  {
    description:
      "Create one team workspace, roster players, post a schedule, and invite parents.",
    intent: "team",
    label: "Coach creates",
    plan: "Free single team",
    title: "Single Team",
  },
  {
    description:
      "Parents do not create teams. They join through a team invite or open registration path.",
    intent: "parent",
    label: "Parent joins",
    plan: "Free parent account",
    title: "Parent / Player",
  },
];

async function getResponseBody(response: Response) {
  return (await response.json().catch(() => null)) as
    | WorkspaceCreateResponse
    | null;
}

function IntentCard({
  active,
  card,
  onSelect,
}: {
  active: boolean;
  card: (typeof intentCards)[number];
  onSelect: (intent: SignupIntent) => void;
}) {
  return (
    <button
      className={`rounded-xl border p-4 text-left shadow-2xl backdrop-blur ${
        active
          ? "border-blue-400 bg-blue-600/15"
          : "border-white/10 bg-white/[0.04] hover:border-blue-400/40"
      }`}
      onClick={() => onSelect(card.intent)}
      type="button"
    >
      <CardContent card={card} />
    </button>
  );
}

function CardContent({ card }: { card: (typeof intentCards)[number] }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-black uppercase text-blue-300">
          {card.label}
        </span>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-slate-200">
          {card.plan}
        </span>
      </div>
      <h2 className="mt-4 text-xl font-black text-white">{card.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
        {card.description}
      </p>
    </>
  );
}

function AccountFields({
  accountName,
  email,
  onAccountNameChange,
  onEmailChange,
  onPasswordChange,
  password,
}: {
  accountName: string;
  email: string;
  onAccountNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  password: string;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-sm font-black text-slate-200">Your name</span>
        <input
          autoComplete="name"
          className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-blue-400"
          onChange={(event) => onAccountNameChange(event.target.value)}
          placeholder="Coach Taylor"
          required
          value={accountName}
        />
      </label>
      <label className="block">
        <span className="text-sm font-black text-slate-200">Email</span>
        <input
          autoComplete="email"
          className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-blue-400"
          onChange={(event) => onEmailChange(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block">
        <span className="text-sm font-black text-slate-200">Password</span>
        <input
          autoComplete="new-password"
          className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-blue-400"
          minLength={6}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
    </div>
  );
}

export default function SignupStartOptions({
  initialIntent = "organization",
  isSignedIn,
}: SignupStartOptionsProps) {
  const [activeIntent, setActiveIntent] =
    useState<SignupIntent>(initialIntent);
  const [accountName, setAccountName] = useState("");
  const [division, setDivision] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hasCreatedSession, setHasCreatedSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [season, setSeason] = useState("2026 Season");
  const needsAccount = !isSignedIn && !hasCreatedSession;

  async function ensureSignedInSession() {
    if (isSignedIn || hasCreatedSession) {
      return;
    }

    const signupResult = await createFirebaseUserWithEmailPassword({
      displayName: accountName,
      email,
      password,
    });

    if (!signupResult) {
      throw new Error("Firebase account creation is not configured.");
    }

    const response = await fetch("/api/session", {
      body: JSON.stringify({ idToken: signupResult.idToken }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const body = await getResponseBody(response);

    if (!response.ok) {
      throw new Error(body?.error ?? "Could not create GameDay session.");
    }

    setHasCreatedSession(true);
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await ensureSignedInSession();

      const response = await fetch("/api/admin/setup", {
        body: JSON.stringify({
          actionType: "workspace-provisioning",
          name,
          workspaceType: "organization",
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await getResponseBody(response);

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create organization.");
      }

      window.location.assign(`/admin?organizationId=${body?.id ?? ""}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create organization.",
      );
      setIsSaving(false);
    }
  }

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      await ensureSignedInSession();

      const response = await fetch("/api/coach/workspaces", {
        body: JSON.stringify({
          division,
          season,
          teamName: name,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await getResponseBody(response);

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create team.");
      }

      window.location.assign("/coach");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create team.",
      );
      setIsSaving(false);
    }
  }

  function handleIntentChange(intent: SignupIntent) {
    setActiveIntent(intent);
    setError(null);
    setIsSaving(false);
    setName("");
    setDivision("");
    setSeason("2026 Season");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        {intentCards.map((card) => (
          <IntentCard
            active={activeIntent === card.intent}
            card={card}
            key={card.intent}
            onSelect={handleIntentChange}
          />
        ))}
      </div>

      {activeIntent === "organization" && (
        <form
          className="rounded-xl border border-blue-400/20 bg-blue-600/10 p-4 shadow-2xl backdrop-blur"
          onSubmit={createOrganization}
        >
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">
            Paid organization
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Create an organization
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
            Best for clubs, leagues, and multi-team groups. Billing starts here
            as an organization plan and can be completed when payments are
            turned on.
          </p>
          {needsAccount && (
            <AccountFields
              accountName={accountName}
              email={email}
              onAccountNameChange={setAccountName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              password={password}
            />
          )}
          <label className="mt-4 block">
            <span className="text-sm font-black text-slate-200">
              Organization name
            </span>
            <input
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-blue-400"
              onChange={(event) => setName(event.target.value)}
              placeholder="PineWood Tackle Football Club"
              required
              value={name}
            />
          </label>
          {error && activeIntent === "organization" && (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-black text-red-200">
              {error}
            </p>
          )}
          <button
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Creating organization..." : "Create paid organization"}
          </button>
        </form>
      )}

      {activeIntent === "team" && (
        <form
          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 shadow-2xl backdrop-blur"
          onSubmit={createTeam}
        >
          <p className="text-xs font-black uppercase tracking-wide text-emerald-200">
            Free single team
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Create one team
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
            Best for a coach running one roster, one schedule, and one parent
            registration link.
          </p>
          {needsAccount && (
            <AccountFields
              accountName={accountName}
              email={email}
              onAccountNameChange={setAccountName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              password={password}
            />
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="text-sm font-black text-slate-200">
                Team name
              </span>
              <input
                className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-emerald-300"
                onChange={(event) => setName(event.target.value)}
                placeholder="Pineboys Tackle"
                required
                value={name}
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-sm font-black text-slate-200">
                Division
              </span>
              <input
                className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-emerald-300"
                onChange={(event) => setDivision(event.target.value)}
                placeholder="10U"
                required
                value={division}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-black text-slate-200">Season</span>
              <input
                className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2.5 text-white outline-none focus:border-emerald-300"
                onChange={(event) => setSeason(event.target.value)}
                required
                value={season}
              />
            </label>
          </div>
          {error && activeIntent === "team" && (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-black text-red-200">
              {error}
            </p>
          )}
          <button
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Creating team..." : "Create free team"}
          </button>
        </form>
      )}

      {activeIntent === "parent" && (
        <section className="rounded-xl border border-orange-300/20 bg-orange-500/10 p-4 shadow-2xl backdrop-blur">
          <p className="text-xs font-black uppercase tracking-wide text-orange-200">
            Free parent access
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Join through a team
          </h2>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-300">
            Parents attach to an organization or team through registration.
            They never create an organization or team workspace.
          </p>
          <Link
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-black text-white hover:bg-orange-400"
            href="/registration"
          >
            Find registration
          </Link>
        </section>
      )}
    </div>
  );
}
