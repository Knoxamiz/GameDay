import { redirect } from "next/navigation";
import ParentLoginForm from "../components/ParentLoginForm";
import { getCurrentAuthSession } from "../data/currentUser.server";
import { getLandingRouteForSession } from "../data/sessionAccess.server";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: Promise<{
    intent?: string | string[];
    next?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeNextPath(params?: {
  intent?: string | string[];
  next?: string | string[];
}) {
  const next = getFirstParam(params?.next);
  const intent = getFirstParam(params?.intent);

  if (next !== "/signup") {
    return undefined;
  }

  const searchParams = new URLSearchParams();

  if (
    intent === "organization" ||
    intent === "team" ||
    intent === "parent"
  ) {
    searchParams.set("intent", intent);
  }

  return searchParams.size > 0
    ? `/signup?${searchParams.toString()}`
    : "/signup";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(resolvedSearchParams);
  const session = await getCurrentAuthSession();

  if (session) {
    redirect(nextPath ?? (await getLandingRouteForSession(session)));
  }

  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <section className="mx-auto max-w-sm px-3 py-3 sm:px-5">
        <div className="gd-card-light rounded-lg p-3">
          <p className="text-xs font-black uppercase text-blue-700">
            GameDay Account
          </p>
          <h1 className="mt-0.5 text-xl font-black tracking-tight">Sign in</h1>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
            One account opens the parent, coach, or admin workspace tied to it.
          </p>
        </div>

        <ParentLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}
