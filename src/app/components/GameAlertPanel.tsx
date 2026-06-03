"use client";

import { useState } from "react";
import {
  gameAlertScoringPresets,
  type GameAlert,
  type GameAlertStatus,
} from "../data/gameAlerts";
import type { MvpNavRole } from "./MvpNav";
import {
  saveGameAlertSnapshot,
  useGameAlertSnapshot,
  type GameAlertSnapshot,
} from "./gameAlertState";

type GameAlertPanelProps = {
  gameAlert: GameAlert;
  role: MvpNavRole;
};

function getStatusLabel(status: GameAlertStatus) {
  if (status === "Live") {
    return "LIVE";
  }

  return status.toUpperCase();
}

function getStatusTone(status: GameAlertStatus) {
  if (status === "Live") {
    return "bg-red-500/20 text-red-300";
  }

  if (status === "Final") {
    return "bg-blue-500/20 text-blue-300";
  }

  return "bg-slate-800 text-slate-300";
}

function getNextStatus(status: GameAlertStatus): GameAlertStatus {
  if (status === "Scheduled") {
    return "Live";
  }

  if (status === "Live") {
    return "Final";
  }

  return "Live";
}

export default function GameAlertPanel({
  gameAlert,
  role,
}: GameAlertPanelProps) {
  const canManage = role === "coach" || role === "admin";
  const [positiveUpdate, setPositiveUpdate] = useState("");
  const snapshot = useGameAlertSnapshot(gameAlert.eventId, {
    status: gameAlert.status,
    homeScore: gameAlert.homeScore,
    awayScore: gameAlert.awayScore,
  });

  function saveSnapshot(nextSnapshot: GameAlertSnapshot) {
    saveGameAlertSnapshot(gameAlert.eventId, nextSnapshot);
  }

  function updateScore(team: "homeScore" | "awayScore", amount: number) {
    const nextScore = Math.max(0, snapshot[team] + amount);
    saveSnapshot({
      ...snapshot,
      [team]: nextScore,
      status: snapshot.status === "Scheduled" ? "Live" : snapshot.status,
    });

    if (amount > 0) {
      setPositiveUpdate(
        `${team === "homeScore" ? gameAlert.homeTeamName : gameAlert.awayTeamName} +${amount}`,
      );
    } else {
      setPositiveUpdate("");
    }
  }

  function updateStatus() {
    setPositiveUpdate("");
    saveSnapshot({
      ...snapshot,
      status: getNextStatus(snapshot.status),
    });
  }

  const scoringPreset = gameAlertScoringPresets[gameAlert.sport];

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Game Alert
          </p>
          <h2 className="mt-2 text-xl font-bold">
            {gameAlert.homeTeamName} vs {gameAlert.awayTeamName}
          </h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(
            snapshot.status,
          )}`}
        >
          {getStatusLabel(snapshot.status)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-sm text-slate-300">{gameAlert.homeTeamName}</p>
          <p className="mt-2 text-4xl font-bold">{snapshot.homeScore}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-sm text-slate-300">{gameAlert.awayTeamName}</p>
          <p className="mt-2 text-4xl font-bold">{snapshot.awayScore}</p>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
        {positiveUpdate || gameAlert.latestUpdate}
      </p>

      {gameAlert.reporterName && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Reporter: {gameAlert.reporterName}
        </p>
      )}

      {canManage && (
        <div className="mt-5 space-y-4">
          <button
            type="button"
            onClick={updateStatus}
            className="w-full rounded-xl bg-blue-500 py-3 text-sm font-semibold text-white"
          >
            {snapshot.status === "Scheduled"
              ? "Start Game"
              : snapshot.status === "Live"
                ? "Mark Final"
                : "Reopen Live"}
          </button>

          <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
            <p className="text-sm font-semibold text-white">
              Score Controls
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {gameAlert.sport} preset. Coach/Admin override only.
            </p>

            {[
              { label: gameAlert.homeTeamName, key: "homeScore" as const },
              { label: gameAlert.awayTeamName, key: "awayScore" as const },
            ].map((team) => (
              <div key={team.key} className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {team.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {scoringPreset.map((amount) => (
                    <button
                      key={`${team.key}-${amount}`}
                      type="button"
                      onClick={() => updateScore(team.key, amount)}
                      className={`rounded-full px-3 py-2 text-sm font-semibold ${
                        amount > 0
                          ? "bg-slate-800 text-blue-300"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {amount > 0 ? `+${amount}` : amount}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
