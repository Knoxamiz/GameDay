"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createFirebaseClientAuthAdapter,
  signInFirebaseAdminWithEmailPassword,
  signInFirebaseParentWithEmailPassword,
} from "../infrastructure/firebaseClientAuth";

type LoginRole = "parent" | "admin";

type SessionResponse = {
  configured?: boolean;
  email?: string;
  error?: string;
  landingRoute?: string;
  role?: LoginRole;
  status?: "preview" | "signed-in" | "signed-out";
};

type SignedInSessionResponse = SessionResponse & {
  role: LoginRole;
  status: "signed-in";
};

type ParentLoginFormProps = {
  initialRole?: LoginRole;
};

function getRoleLabel(role: LoginRole) {
  return role === "admin" ? "Admin" : "Parent";
}

function getRoleRoute(role: LoginRole) {
  return role === "admin" ? "/admin" : "/parent";
}

function isSignedInSession(
  session: SessionResponse | null,
): session is SignedInSessionResponse {
  return Boolean(
    session?.status === "signed-in" &&
      (session.role === "parent" || session.role === "admin"),
  );
}

export default function ParentLoginForm({
  initialRole = "parent",
}: ParentLoginFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<LoginRole>(initialRole);
  const [session, setSession] = useState<SessionResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setIsCheckingSession(true);

      try {
        const response = await fetch("/api/session", { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as
          | SessionResponse
          | null;

        if (isMounted && response.ok) {
          setSession(body);
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loginResult =
        role === "admin"
          ? await signInFirebaseAdminWithEmailPassword({
              email,
              password,
            })
          : await signInFirebaseParentWithEmailPassword({
              email,
              password,
            });

      if (!loginResult) {
        throw new Error("Firebase client login is not configured.");
      }

      const response = await fetch("/api/session", {
        body: JSON.stringify({ idToken: loginResult.idToken }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | SessionResponse
          | null;
        throw new Error(body?.error ?? "Could not create GameDay session.");
      }

      const body = (await response.json().catch(() => null)) as
        | SessionResponse
        | null;

      window.location.assign(body?.landingRoute ?? getRoleRoute(role));
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Could not sign in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setError(null);
    setIsSubmitting(true);

    try {
      await fetch("/api/session", { method: "DELETE" });
      const adapter = await createFirebaseClientAuthAdapter();
      await adapter?.logout();
      setEmail("");
      setPassword("");
      setSession({ status: "signed-out" });
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Could not sign out.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const signedInSession = isSignedInSession(session) ? session : null;

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <h2 className="text-xl font-bold">Sign in to GameDay</h2>
      <p className="mt-2 text-sm text-slate-400">
        Parent and admin accounts use Firebase. Preview pages remain available
        when Firebase is not configured.
      </p>

      {isCheckingSession && (
        <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm font-semibold text-slate-300">
          Checking current sign-in...
        </p>
      )}

      {signedInSession ? (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
            <p className="font-semibold">
              Signed in as {getRoleLabel(signedInSession.role)}
            </p>
            {signedInSession.email && (
              <p className="mt-1 text-blue-100/80">{signedInSession.email}</p>
            )}
          </div>

          <a
            className="block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
            href={signedInSession.landingRoute ?? getRoleRoute(signedInSession.role)}
          >
            Continue to {getRoleLabel(signedInSession.role)}
          </a>

          <button
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={handleLogout}
            type="button"
          >
            {isSubmitting ? "Signing Out..." : "Sign Out"}
          </button>
        </div>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleLogin}>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-300">
              Account type
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-semibold">
              {(["parent", "admin"] as const).map((option) => (
                <button
                  className={`rounded-xl border px-4 py-3 ${
                    role === option
                      ? "border-blue-500 bg-blue-500/20 text-blue-200"
                      : "border-slate-700 bg-slate-950 text-slate-300"
                  }`}
                  key={option}
                  onClick={() => setRole(option)}
                  type="button"
                >
                  {getRoleLabel(option)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Email</span>
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-300">Password</span>
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-xl bg-blue-500 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Signing In..."
              : `Sign in as ${getRoleLabel(role)}`}
          </button>
        </form>
      )}
    </div>
  );
}
