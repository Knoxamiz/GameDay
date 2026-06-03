import type { ReadinessConcern, ReadinessResult } from "./readiness";

export type ReadinessActionLinks = {
  attendanceHref?: string;
  registrationHref?: string;
  scheduleHref?: string;
  transportationHref?: string;
};

export type ReadinessAction = {
  href?: string;
  label: string;
  priority: number;
  source: ReadinessConcern["source"];
};

function getActionForConcern(
  concern: ReadinessConcern,
  links: ReadinessActionLinks,
): ReadinessAction {
  if (concern.source === "Attendance") {
    return {
      href: links.attendanceHref,
      label: concern.label.includes("not attending")
        ? "Review attendance plan"
        : "Confirm attendance",
      priority: concern.category === "Needs Attention" ? 3 : 2,
      source: concern.source,
    };
  }

  if (concern.source === "Transportation") {
    return {
      href: links.transportationHref,
      label: concern.label.includes("ride")
        ? "Update ride plan"
        : "Confirm transportation",
      priority: concern.category === "Needs Attention" ? 3 : 2,
      source: concern.source,
    };
  }

  if (concern.source === "Registration") {
    return {
      href: links.registrationHref,
      label: concern.label.includes("rejected")
        ? "Review registration decision"
        : "Review registration",
      priority: concern.category === "Blocked" ? 4 : 3,
      source: concern.source,
    };
  }

  return {
    href: links.scheduleHref,
    label: "Check schedule",
    priority: 1,
    source: concern.source,
  };
}

export function buildReadinessActions(
  readiness: ReadinessResult,
  links: ReadinessActionLinks = {},
) {
  const actionsByKey = new Map<string, ReadinessAction>();

  readiness.concerns.forEach((concern) => {
    const action = getActionForConcern(concern, links);
    const key = `${action.source}-${action.label}`;
    const existingAction = actionsByKey.get(key);

    if (!existingAction || action.priority > existingAction.priority) {
      actionsByKey.set(key, action);
    }
  });

  return [...actionsByKey.values()].sort(
    (firstAction, secondAction) => secondAction.priority - firstAction.priority,
  );
}
