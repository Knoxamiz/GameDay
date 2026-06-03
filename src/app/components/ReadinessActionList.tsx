import Link from "next/link";
import type { ReadinessAction } from "../data/readinessActions";

type ReadinessActionListProps = {
  actions: ReadinessAction[];
  emptyText?: string;
  limit?: number;
  title?: string;
};

export default function ReadinessActionList({
  actions,
  emptyText = "No readiness actions needed.",
  limit = 3,
  title = "Next Actions",
}: ReadinessActionListProps) {
  const visibleActions = actions.slice(0, limit);

  return (
    <div className="mt-4 space-y-2 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {visibleActions.length > 0 ? (
        visibleActions.map((action) =>
          action.href ? (
            <Link
              key={`${action.source}-${action.label}`}
              href={action.href}
              className="block rounded-xl bg-slate-800 p-3 font-semibold text-white"
            >
              {action.label}
            </Link>
          ) : (
            <p
              key={`${action.source}-${action.label}`}
              className="rounded-xl bg-slate-800 p-3 text-slate-300"
            >
              {action.label}
            </p>
          ),
        )
      ) : (
        <p className="rounded-xl bg-slate-800 p-3 text-blue-300">{emptyText}</p>
      )}
    </div>
  );
}
