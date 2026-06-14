import type { GameAlert, GameAlertStatus } from "../data/gameAlerts";
import type { MvpNavRole } from "./MvpNav";

type GameAlertPanelProps = {
  gameAlert: GameAlert;
  role: MvpNavRole;
};

function getStatusLabel(status: GameAlertStatus) {
  return status === "Live" ? "LIVE" : status.toUpperCase();
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

export default function GameAlertPanel({ gameAlert, role }: GameAlertPanelProps) {
  const canManage = role === "coach" || role === "admin";

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
            gameAlert.status,
          )}`}
        >
          {getStatusLabel(gameAlert.status)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-sm text-slate-300">{gameAlert.homeTeamName}</p>
          <p className="mt-2 text-4xl font-bold">{gameAlert.homeScore}</p>
        </div>
        <div className="rounded-xl bg-slate-800 p-4">
          <p className="text-sm text-slate-300">{gameAlert.awayTeamName}</p>
          <p className="mt-2 text-4xl font-bold">{gameAlert.awayScore}</p>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
        {gameAlert.latestUpdate}
      </p>

      {canManage && (
        <p className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300">
          Live score and alert updates are not available yet.
        </p>
      )}
    </div>
  );
}
