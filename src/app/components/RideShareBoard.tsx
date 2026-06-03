"use client";

import {
  buildRideShareMatches,
  type RideShareMatch,
  type RideShareMatchStatus,
  type RideShareParticipant,
} from "../data/rideShare";
import type { TransportationEntry } from "../data/transportation";
import type { MvpNavRole } from "./MvpNav";
import { saveRideShareStatus, useRideShareStatus } from "./rideShareState";
import { useTransportationEntries } from "./transportationStatusState";

type RideShareBoardProps = {
  entries: TransportationEntry[];
  eventId: string;
  role?: MvpNavRole;
  title?: string;
};

type RideShareMatchCardProps = {
  canManage: boolean;
  match: RideShareMatch;
};

type RideShareQuickListProps = {
  emptyText: string;
  label: string;
  participants: RideShareParticipant[];
  type: "needs" | "offers";
};

function getStatusTone(status: RideShareMatchStatus) {
  if (status === "Confirmed") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (status === "Requested") {
    return "bg-yellow-500/20 text-yellow-200";
  }

  return "bg-slate-800 text-slate-300";
}

function RideShareQuickList({
  emptyText,
  label,
  participants,
  type,
}: RideShareQuickListProps) {
  return (
    <div className="rounded-xl bg-slate-800 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {participants.length > 0 ? (
        <div className="mt-2 space-y-2">
          {participants.map((participant) => (
            <p key={participant.id} className="flex justify-between gap-3">
              <span className="font-semibold text-white">
                {type === "needs" ? participant.name : participant.guardianName}
              </span>
              <span
                className={
                  type === "needs" ? "text-red-300" : "text-blue-300"
                }
              >
                {type === "needs"
                  ? participant.pickupPreference
                  : `${participant.seatsAvailable ?? 0} seats`}
              </span>
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}

function RideShareMatchCard({ canManage, match }: RideShareMatchCardProps) {
  const status = useRideShareStatus(
    match.eventId,
    match.id,
    match.initialStatus,
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">
            {match.driver.guardianName} to {match.rider.name}
          </p>
          <p className="mt-1 text-slate-400">
            {match.rider.pickupPreference} pickup,{" "}
            {match.driver.dropoffPreference.toLowerCase()} dropoff
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
            status,
          )}`}
        >
          {status}
        </span>
      </div>

      {status === "Confirmed" && (
        <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-100">
          <p>{match.privateDetailCopy}</p>
        </div>
      )}

      {canManage ? (
        <div className="mt-4 grid gap-2">
          {status === "Open" && (
            <button
              type="button"
              onClick={() =>
                saveRideShareStatus(match.eventId, match.id, "Requested")
              }
              className="rounded-xl bg-blue-500 py-3 font-semibold text-white"
            >
              Start Safe Ride Request
            </button>
          )}
          {status === "Requested" && (
            <button
              type="button"
              onClick={() =>
                saveRideShareStatus(match.eventId, match.id, "Confirmed")
              }
              className="rounded-xl bg-blue-500 py-3 font-semibold text-white"
            >
              Confirm Ride Match
            </button>
          )}
          {status !== "Open" && match.driver.contactHref && (
            <a
              href={match.driver.contactHref}
              className="rounded-xl border border-slate-700 bg-slate-900 py-3 text-center font-semibold text-white"
            >
              Contact Matched Parent
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-800 p-3 text-slate-300">
          Parent-managed match.
        </p>
      )}
    </div>
  );
}

export default function RideShareBoard({
  entries,
  eventId,
  role = "parent",
  title = "Ride Share",
}: RideShareBoardProps) {
  const currentEntries = useTransportationEntries(eventId, entries);
  const { drivers, matches, riders } = buildRideShareMatches(
    eventId,
    currentEntries,
  );
  const canManage = role === "parent";
  const seatsAvailable = drivers.reduce(
    (totalSeats, driver) => totalSeats + (driver.seatsAvailable ?? 0),
    0,
  );

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Safe Ride Coordination
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            riders.length > 0
              ? "bg-red-500/20 text-red-300"
              : "bg-blue-500/20 text-blue-300"
          }`}
        >
          {riders.length > 0 ? `${riders.length} Need Help` : "Covered"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Need</p>
          <p className="mt-1 text-xl font-bold text-red-300">
            {riders.length}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Offers</p>
          <p className="mt-1 text-xl font-bold text-blue-300">
            {drivers.length}
          </p>
        </div>
        <div className="rounded-xl bg-slate-800 p-3">
          <p className="text-slate-400">Seats</p>
          <p className="mt-1 text-xl font-bold text-blue-300">
            {seatsAvailable}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <RideShareQuickList
          emptyText="No ride needs."
          label="Needs Ride"
          participants={riders}
          type="needs"
        />
        <RideShareQuickList
          emptyText="No offers yet."
          label="Can Offer"
          participants={drivers}
          type="offers"
        />
      </div>

      <div className="mt-4 rounded-xl bg-slate-800 p-3">
        <h3 className="font-semibold">Match</h3>
        <div className="mt-3 space-y-3">
          {matches.length > 0 ? (
            matches.map((match) => (
              <RideShareMatchCard
                key={match.id}
                canManage={canManage}
                match={match}
              />
            ))
          ) : (
            <p className="text-sm text-slate-400">
              Add one need and one offer to create a match.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
