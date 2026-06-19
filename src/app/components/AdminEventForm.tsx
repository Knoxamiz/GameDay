"use client";

import { useMemo, useState } from "react";
import type {
  GameDayEvent,
  GameDayEventStatus,
  GameDayEventType,
} from "../data/events";
import { isActiveTeam, type Team } from "../data/teams";

type AdminEventFormProps = {
  activeOrganizationId: string;
  canCreateEvents: boolean;
  defaultOpen?: boolean;
  events?: GameDayEvent[];
  teams: Team[];
};

type AdminEventResponse = {
  error?: string;
  id?: string;
  ids?: string[];
  message?: string;
};

type CreateEventStatus = Exclude<
  GameDayEventStatus,
  "archived" | "canceled"
>;

const eventTypeOptions: { label: string; value: GameDayEventType }[] = [
  { label: "Practice", value: "practice" },
  { label: "Game", value: "game" },
  { label: "Tournament", value: "tournament" },
  { label: "Meeting", value: "meeting" },
  { label: "Other", value: "other" },
];

const eventStatusOptions: { label: string; value: CreateEventStatus }[] = [
  { label: "Published", value: "published" },
  { label: "Draft", value: "draft" },
];

const weekdayOptions = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateInput(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getDefaultDate() {
  return formatDateInput(addDays(new Date(), 1));
}

function getDefaultRangeEnd(dateValue: string) {
  const date = parseDateInput(dateValue) ?? new Date();

  return formatDateInput(addDays(date, 30));
}

function toIsoDateTime(dateValue: string, timeValue: string) {
  const date = parseDateInput(dateValue);
  const [hours, minutes] = timeValue.split(":").map(Number);

  if (!date || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "";
  }

  date.setHours(hours, minutes, 0, 0);

  return date.toISOString();
}

function getMonthTitle(monthDate: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(monthDate);
}

function getDisplayDate(dateValue: string) {
  const date = parseDateInput(dateValue);

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(date);
}

function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const days: (string | null)[] = Array(firstDay.getDay()).fill(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(
      formatDateInput(
        new Date(monthDate.getFullYear(), monthDate.getMonth(), day),
      ),
    );
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function getEventDateKey(event: GameDayEvent) {
  const date = new Date(event.startsAt);

  return Number.isNaN(date.getTime()) ? "" : formatDateInput(date);
}

function generateRepeatingDates({
  endDate,
  selectedWeekdays,
  startDate,
}: {
  endDate: string;
  selectedWeekdays: number[];
  startDate: string;
}) {
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);

  if (!start || !end || end < start || selectedWeekdays.length === 0) {
    return [];
  }

  const selectedWeekdaySet = new Set(selectedWeekdays);
  const dates: string[] = [];
  let currentDate = new Date(start);

  while (currentDate <= end && dates.length < 80) {
    if (selectedWeekdaySet.has(currentDate.getDay())) {
      dates.push(formatDateInput(currentDate));
    }

    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

export default function AdminEventForm({
  activeOrganizationId,
  canCreateEvents,
  defaultOpen = false,
  events = [],
  teams,
}: AdminEventFormProps) {
  const availableTeams = teams.filter(
    (team) =>
      team.organizationId === activeOrganizationId && isActiveTeam(team),
  );
  const defaultDate = getDefaultDate();
  const [mode, setMode] = useState<"single" | "repeat">("single");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() =>
    availableTeams.length === 1 ? [availableTeams[0].id] : [],
  );
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [calendarMonth, setCalendarMonth] = useState(
    parseDateInput(defaultDate) ?? new Date(),
  );
  const [title, setTitle] = useState("");
  const [type, setType] = useState<GameDayEventType>("practice");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CreateEventStatus>("published");
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([1, 5]);
  const [repeatStartDate, setRepeatStartDate] = useState(defaultDate);
  const [repeatEndDate, setRepeatEndDate] = useState(
    getDefaultRangeEnd(defaultDate),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventCountsByDate = useMemo(() => {
    const counts = new Map<string, number>();

    events.forEach((event) => {
      const dateKey = getEventDateKey(event);

      if (dateKey) {
        counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
      }
    });

    return counts;
  }, [events]);
  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth),
    [calendarMonth],
  );
  const repeatingDates = useMemo(
    () =>
      generateRepeatingDates({
        endDate: repeatEndDate,
        selectedWeekdays: repeatWeekdays,
        startDate: repeatStartDate,
      }),
    [repeatEndDate, repeatStartDate, repeatWeekdays],
  );

  function toggleTeam(teamId: string) {
    setSelectedTeamIds((currentTeamIds) =>
      currentTeamIds.includes(teamId)
        ? currentTeamIds.filter((currentTeamId) => currentTeamId !== teamId)
        : [...currentTeamIds, teamId],
    );
  }

  function toggleRepeatWeekday(weekday: number) {
    setRepeatWeekdays((currentWeekdays) =>
      currentWeekdays.includes(weekday)
        ? currentWeekdays.filter((currentWeekday) => currentWeekday !== weekday)
        : [...currentWeekdays, weekday].sort((first, second) => first - second),
    );
  }

  function selectDate(dateValue: string) {
    const nextDate = parseDateInput(dateValue);

    setSelectedDate(dateValue);

    if (nextDate) {
      setCalendarMonth(
        new Date(nextDate.getFullYear(), nextDate.getMonth(), 1),
      );
    }
  }

  function validateBaseEventDetails() {
    if (selectedTeamIds.length === 0) {
      return "Choose at least one team.";
    }

    if (!title.trim()) {
      return "Enter an event title.";
    }

    if (!locationName.trim()) {
      return "Enter a location.";
    }

    if (!startTime || !endTime) {
      return "Choose start and end times.";
    }

    return null;
  }

  function getEventPayload(dateValue: string) {
    return {
      activeOrganizationId,
      address,
      endsAt: toIsoDateTime(dateValue, endTime),
      locationName,
      notes,
      organizationId: activeOrganizationId,
      startsAt: toIsoDateTime(dateValue, startTime),
      status,
      teamIds: selectedTeamIds,
      title,
      type,
    };
  }

  async function saveSingleEvent() {
    setError(null);
    setMessage(null);

    const validationError = validateBaseEventDetails();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/events", {
        body: JSON.stringify(getEventPayload(selectedDate)),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminEventResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create event.");
      }

      setMessage(body?.message ?? "Event created.");
      window.location.reload();
    } catch (eventError) {
      setError(
        eventError instanceof Error
          ? eventError.message
          : "Could not create event.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRepeatingEvents() {
    setError(null);
    setMessage(null);

    const validationError = validateBaseEventDetails();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (repeatingDates.length === 0) {
      setError("Choose repeat days and a valid date range.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/events", {
        body: JSON.stringify({
          activeOrganizationId,
          events: repeatingDates.map((dateValue) => getEventPayload(dateValue)),
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminEventResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create events.");
      }

      setMessage(body?.message ?? `${repeatingDates.length} events created.`);
      window.location.reload();
    } catch (eventError) {
      setError(
        eventError instanceof Error
          ? eventError.message
          : "Could not create events.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!canCreateEvents) {
    return null;
  }

  return (
    <details
      className="gd-card-dark gd-card-interactive rounded-lg"
      id="create-event"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-black text-white">Create schedule</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-400">
              Click a day for one event, or repeat events across the season.
            </p>
          </div>
          <span className="inline-flex rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white">
            Scheduler +
          </span>
        </div>
      </summary>

      <div className="border-t border-white/10 p-3">
        {message && (
          <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-700">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        {availableTeams.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 bg-white/5 p-3 text-sm font-semibold text-slate-400">
            Create or activate a team before adding events.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 rounded-md bg-slate-950/80 p-1 text-sm font-black">
              <button
                className={`rounded px-3 py-1.5 ${
                  mode === "single"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400"
                }`}
                onClick={() => setMode("single")}
                type="button"
              >
                One day
              </button>
              <button
                className={`rounded px-3 py-1.5 ${
                  mode === "repeat"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400"
                }`}
                onClick={() => setMode("repeat")}
                type="button"
              >
                Repeat days
              </button>
            </div>

            <fieldset>
              <legend className="text-sm font-black text-slate-200">
                Teams
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTeams.map((team) => (
                  <label
                    className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-2 text-sm font-black ${
                      selectedTeamIds.includes(team.id)
                        ? "border-blue-400 bg-blue-500/20 text-blue-100"
                        : "border-white/15 bg-slate-950/70 text-slate-300 hover:bg-white/10"
                    }`}
                    key={team.id}
                  >
                    <input
                      checked={selectedTeamIds.includes(team.id)}
                      className="sr-only"
                      onChange={() => toggleTeam(team.id)}
                      type="checkbox"
                    />
                    <span>{team.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mode === "single" ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <section className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      className="rounded-md border border-white/15 px-3 py-2 text-sm font-black text-slate-200 hover:bg-white/10"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      type="button"
                    >
                      &larr;
                    </button>
                    <h3 className="text-base font-black">
                      {getMonthTitle(calendarMonth)}
                    </h3>
                    <button
                      className="rounded-md border border-white/15 px-3 py-2 text-sm font-black text-slate-200 hover:bg-white/10"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      type="button"
                    >
                      &rarr;
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-black uppercase text-slate-400">
                    {weekdayOptions.map((weekday) => (
                      <span key={weekday.value}>{weekday.label}</span>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {calendarDays.map((dateValue, index) => {
                      const eventCount = dateValue
                        ? eventCountsByDate.get(dateValue) ?? 0
                        : 0;
                      const isSelected = dateValue === selectedDate;

                      return dateValue ? (
                        <button
                          className={`min-h-10 rounded-md border p-1 text-left text-xs font-black transition ${
                            isSelected
                              ? "border-blue-400 bg-blue-500/20 text-blue-100"
                              : "border-white/10 bg-slate-950/65 text-slate-200 hover:border-blue-300/50 hover:bg-blue-500/10"
                          }`}
                          key={dateValue}
                          onClick={() => selectDate(dateValue)}
                          type="button"
                        >
                          <span>
                            {parseDateInput(dateValue)?.getDate() ?? ""}
                          </span>
                          {eventCount > 0 && (
                            <span className="mt-1 block rounded-full bg-white/10 px-1.5 py-0.5 text-center text-[10px] text-slate-300">
                              {eventCount}
                            </span>
                          )}
                        </button>
                      ) : (
                        <span
                          aria-hidden="true"
                          className="min-h-10 rounded-md bg-white/5"
                          key={`blank-${index}`}
                        />
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                  <p className="text-sm font-black uppercase text-blue-200">
                    Selected day
                  </p>
                  <p className="mt-1 text-base font-black text-white">
                    {getDisplayDate(selectedDate)}
                  </p>
                  <div className="mt-3 space-y-2.5">
                    <label className="block">
                      <span className="text-sm font-black text-slate-300">
                        Title
                      </span>
                      <input
                        className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Practice"
                        value={title}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <label className="block">
                          <span className="text-sm font-black text-slate-300">
                          Starts
                        </span>
                        <input
                          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                          onChange={(event) => setStartTime(event.target.value)}
                          type="time"
                          value={startTime}
                        />
                      </label>
                      <label className="block">
                          <span className="text-sm font-black text-slate-300">
                          Ends
                        </span>
                        <input
                          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                          onChange={(event) => setEndTime(event.target.value)}
                          type="time"
                          value={endTime}
                        />
                      </label>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <section className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div>
                    <h3 className="text-base font-black text-white">Repeat schedule</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Choose days, date range, and time. Review the dates before
                      saving.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {weekdayOptions.map((weekday) => (
                        <label
                          className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-black ${
                            repeatWeekdays.includes(weekday.value)
                              ? "border-blue-400 bg-blue-500/20 text-blue-100"
                              : "border-white/15 bg-slate-950/70 text-slate-300 hover:bg-white/10"
                          }`}
                          key={weekday.value}
                        >
                          <input
                            checked={repeatWeekdays.includes(weekday.value)}
                            className="sr-only"
                            onChange={() => toggleRepeatWeekday(weekday.value)}
                            type="checkbox"
                          />
                          {weekday.label}
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-black text-slate-300">
                          Starts after
                        </span>
                        <input
                          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                          onChange={(event) =>
                            setRepeatStartDate(event.target.value)
                          }
                          type="date"
                          value={repeatStartDate}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-black text-slate-300">
                          Ends by
                        </span>
                        <input
                          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                          onChange={(event) =>
                            setRepeatEndDate(event.target.value)
                          }
                          type="date"
                          value={repeatEndDate}
                        />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-black text-slate-300">
                          Starts
                        </span>
                        <input
                          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                          onChange={(event) => setStartTime(event.target.value)}
                          type="time"
                          value={startTime}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-black text-slate-300">
                          Ends
                        </span>
                        <input
                          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                          onChange={(event) => setEndTime(event.target.value)}
                          type="time"
                          value={endTime}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-md border border-white/10 bg-white/5 p-2.5">
                    <p className="text-sm font-black text-white">
                      Preview
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {repeatingDates.length} events
                    </p>
                    <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
                      {repeatingDates.length === 0 ? (
                        <p className="rounded-md border border-dashed border-white/15 bg-slate-950/70 p-2.5 text-sm font-semibold text-slate-400">
                          No dates match yet.
                        </p>
                      ) : (
                        repeatingDates.map((dateValue) => (
                          <p
                            className="rounded-md border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-black text-white"
                            key={dateValue}
                          >
                            {getDisplayDate(dateValue)}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-black text-slate-300">
                    Type
                  </span>
                  <select
                    className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                    onChange={(event) =>
                      setType(event.target.value as GameDayEventType)
                    }
                    value={type}
                  >
                    {eventTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-black text-slate-300">
                    Status
                  </span>
                  <select
                    className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                    onChange={(event) =>
                      setStatus(event.target.value as CreateEventStatus)
                    }
                    value={status}
                  >
                    {eventStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {mode === "repeat" && (
                <label className="mt-3 block">
                    <span className="text-sm font-black text-slate-300">
                    Title
                  </span>
                  <input
                    className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Practice"
                    value={title}
                  />
                </label>
              )}

              <label className="mt-3 block">
                <span className="text-sm font-black text-slate-300">
                  Location
                </span>
                <input
                  className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="Practice field"
                  value={locationName}
                />
              </label>

              <details className="mt-3 rounded-md border border-white/10 bg-white/5 p-3">
                <summary className="cursor-pointer text-sm font-black text-slate-200">
                  More details
                </summary>
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      Address
                    </span>
                    <input
                      className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                      onChange={(event) => setAddress(event.target.value)}
                      value={address}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold uppercase text-slate-400">
                      Notes
                    </span>
                    <textarea
                      className="mt-1 min-h-16 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
                      onChange={(event) => setNotes(event.target.value)}
                      value={notes}
                    />
                  </label>
                </div>
              </details>
            </section>

            <button
              className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() =>
                mode === "single"
                  ? void saveSingleEvent()
                  : void saveRepeatingEvents()
              }
              type="button"
            >
              {isSaving
                ? "Creating..."
                : mode === "single"
                  ? "Create Event"
                  : `Create ${repeatingDates.length} Events`}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
