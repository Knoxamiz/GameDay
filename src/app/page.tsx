import Link from "next/link";
import MvpNav from "./components/MvpNav";
import { athletes } from "./data/athletes";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <h1 className="text-3xl font-bold">GameDay</h1>
        <p className="mt-2 text-slate-300">Welcome Jennifer</p>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-400">
          My Athletes
        </h2>

        <div className="mt-4 space-y-4">
          {athletes.map((athlete) => (
            <div
              key={athlete.name}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg"
            >
              <h3 className="text-xl font-bold">{athlete.name}</h3>
              <p className="mt-1 text-sm text-slate-400">{athlete.team}</p>

              <div className="mt-4 rounded-xl bg-slate-800 p-4">
                <p className="font-semibold">{athlete.nextEvent.title}</p>
                {athlete.nextEvent.time && (
                  <p className="mt-1 text-sm text-slate-300">
                    {athlete.nextEvent.time}
                  </p>
                )}
                {athlete.nextEvent.location && (
                  <p className="mt-1 text-sm text-slate-300">
                    {athlete.nextEvent.location}
                  </p>
                )}
              </div>

              <Link
                href={`/athletes/${athlete.id}`}
                className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Important Announcements</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>• Uniform pickup Friday</li>
            <li>• Tournament schedule updated</li>
          </ul>
        </div>

        <nav className="mt-8 grid grid-cols-4 gap-2 text-center text-xs text-slate-400">
          <span>Home</span>
          <span>Messages</span>
          <span>Registration</span>
          <span>More</span>
        </nav>
      </section>
    </main>
  );
}
