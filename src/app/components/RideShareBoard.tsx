import type { TransportationEntry } from "../data/transportation";
import type { MvpNavRole } from "./MvpNav";

type RideShareBoardProps = {
  entries: TransportationEntry[];
  eventId: string;
  role?: MvpNavRole;
  title?: string;
};

export default function RideShareBoard({
  entries,
  eventId,
  role = "parent",
  title = "Ride Share",
}: RideShareBoardProps) {
  void entries;
  void eventId;
  void role;

  return (
    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
        Ride-share matching is not available yet. No ride request or match will
        be saved from this screen.
      </p>
    </div>
  );
}
