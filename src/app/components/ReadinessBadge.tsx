import { getReadinessTone, type ReadinessCategory } from "../data/readiness";

type ReadinessBadgeProps = {
  category: ReadinessCategory;
};

export default function ReadinessBadge({ category }: ReadinessBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${getReadinessTone(
        category,
      )}`}
    >
      {category}
    </span>
  );
}
