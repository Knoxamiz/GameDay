import MvpNav from "../components/MvpNav";
import ParentLoginForm from "../components/ParentLoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav role="parent" />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">GameDay</h1>
        </div>

        <ParentLoginForm />
      </section>
    </main>
  );
}
