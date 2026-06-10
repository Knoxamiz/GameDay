import MvpNav from "../components/MvpNav";
import ParentLoginForm from "../components/ParentLoginForm";

const loginRoles = ["parent", "coach", "admin"] as const;

type LoginRole = (typeof loginRoles)[number];

type LoginPageProps = {
  searchParams?: Promise<{
    role?: string | string[];
  }>;
};

function getLoginRole(value?: string | string[]): LoginRole {
  const role = Array.isArray(value) ? value[0] : value;

  return loginRoles.includes(role as LoginRole) ? (role as LoginRole) : "parent";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const initialRole = getLoginRole((await searchParams)?.role);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role={initialRole} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
          <p className="mt-3 text-sm text-slate-300">
            Sign in with your parent, coach, or admin account.
          </p>
        </div>

        <ParentLoginForm key={initialRole} initialRole={initialRole} />
      </section>
    </main>
  );
}
