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
    <details className="gd-card-dark group mt-3 overflow-hidden rounded-lg">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
        <h2 className="text-base font-black">{title}</h2>
        <span className="text-lg font-black text-blue-300 transition group-open:rotate-90">
          &rsaquo;
        </span>
      </summary>
      <p className="border-t border-white/10 p-3 text-xs text-slate-300">
        Ride-share matching is not available yet. No ride request or match will
        be saved from this screen.
      </p>
    </details>
  );
}
