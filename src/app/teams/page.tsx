import Link from "next/link";
import MvpNav from "../components/MvpNav";
import { getAthletesByIds } from "../data/athletes";
import { getCoachesByIds } from "../data/coaches";
import { getEventById, getEventsByIds } from "../data/events";
import {
  teamAnnouncementsByTeamId,
  teamCommunicationItems,
} from "../data/messages";
import { getTeamById } from "../data/teams";

const teamDetails = getTeamById("black-diamonds-12u");
const teamCoaches = teamDetails ? getCoachesByIds(teamDetails.coachIds) : [];
const nextEvent = teamDetails?.nextEventId
  ? getEventById(teamDetails.nextEventId)
  : undefined;
const rosterPreview = teamDetails
  ? getAthletesByIds(teamDetails.rosterPreviewIds)
  : [];
const teamAnnouncements = teamDetails
  ? teamAnnouncementsByTeamId[teamDetails.id] ?? []
  : [];
const upcomingEvents = teamDetails ? getEventsByIds(teamDetails.eventIds) : [];

export default function TeamsHome() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-md px-5 py-6">
        <MvpNav />

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <Link href="/coach" className="text-2xl font-bold">
            Back {teamDetails?.name}
          </Link>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <h1 className="text-3xl font-bold">{teamDetails?.name}</h1>
          <p className="mt-3 text-sm text-slate-300">
            {teamDetails?.playerCount} Players
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {teamCoaches.map((coach) => (
              <p key={coach.id}>{coach.name}</p>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Next Event
          </h2>
          <div className="mt-4 rounded-xl bg-slate-800 p-4">
            <p className="font-semibold">{nextEvent?.type}</p>
            <p className="mt-3 text-sm text-slate-300">{nextEvent?.date}</p>
            <p className="mt-1 text-sm text-slate-300">{nextEvent?.time}</p>
            <p className="mt-3 text-sm text-slate-300">
              {nextEvent?.location}
            </p>
          </div>
          <Link
            href="/events"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Event
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Roster</h2>
          <p className="mt-3 text-sm text-slate-300">
            {teamDetails?.playerCount} Players
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {rosterPreview.map((player) => (
              <p key={player.id}>{player.name}</p>
            ))}
            <p>...</p>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-900 py-3 font-semibold text-white"
          >
            View Full Roster
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Announcements</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {teamAnnouncements.map((announcement) => (
              <p key={announcement}>{announcement}</p>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Team Status</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {teamDetails?.status.map((status) => (
              <p key={status}>{status}</p>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Upcoming Events</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {upcomingEvents.map((event) => (
              <p key={event.id}>
                {event.shortDate} {event.type}
              </p>
            ))}
          </div>
          <Link
            href="/events"
            className="mt-4 block w-full rounded-xl bg-blue-500 py-3 text-center font-semibold text-white"
          >
            View Schedule
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-bold">Communication</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            {teamCommunicationItems.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
