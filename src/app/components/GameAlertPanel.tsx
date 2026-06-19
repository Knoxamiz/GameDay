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
    <details className="gd-card-dark mt-3 rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Game Alert
          </p>
          <h2 className="mt-0.5 text-sm font-black text-white">
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
      </summary>
      <div className="border-t border-white/10 px-3 pb-3 pt-2">

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-white/10 bg-white/5 p-2.5">
          <p className="text-sm text-slate-300">{gameAlert.homeTeamName}</p>
          <p className="mt-1 text-2xl font-black text-white">{gameAlert.homeScore}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/5 p-2.5">
          <p className="text-sm text-slate-300">{gameAlert.awayTeamName}</p>
          <p className="mt-1 text-2xl font-black text-white">{gameAlert.awayScore}</p>
        </div>
      </div>

      <p className="mt-2 rounded-md border border-white/10 bg-white/5 p-2.5 text-sm text-slate-300">
        {gameAlert.latestUpdate}
      </p>

      {canManage && (
        <p className="mt-2 rounded-md border border-white/10 bg-slate-950/70 p-2.5 text-sm text-slate-300">
          Live score and alert updates are not available yet.
        </p>
      )}
      </div>
    </details>
  );
}
