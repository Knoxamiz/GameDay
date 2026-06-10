export type GameDayEvent = {
  id: string;
  organizationId: string;
  teamId?: string;
  type: string;
  title: string;
  date: string;
  shortDate: string;
  time: string;
  startDateTime?: string;
  endDateTime?: string;
  location: string;
  directionsUrl: string;
  status?: string;
  lastUpdated?: string;
  notes: string[];
};

const practiceTimeRange = "6:00 PM - 7:30 PM";
const winslowTownshipPark = {
  location: "Winslow Township Park",
  directionsUrl: "https://maps.google.com/?q=Winslow%20Township%20Park",
};

export const events: GameDayEvent[] = [
  {
    id: "practice-jun-2",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-12u",
    type: "Practice",
    title: "Practice Tonight",
    date: "Tuesday, June 2",
    shortDate: "Jun 2",
    time: practiceTimeRange,
    startDateTime: "2026-06-02T18:00:00-04:00",
    endDateTime: "2026-06-02T19:30:00-04:00",
    ...winslowTownshipPark,
    status: "Event Active",
    lastUpdated: "Today 3:42 PM",
    notes: ["Grass field", "Bathrooms available", "Parking lot entrance open"],
  },
  {
    id: "practice-jun-5",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-12u",
    type: "Practice",
    title: "Practice",
    date: "Friday, June 5",
    shortDate: "Jun 5",
    time: practiceTimeRange,
    startDateTime: "2026-06-05T18:00:00-04:00",
    endDateTime: "2026-06-05T19:30:00-04:00",
    ...winslowTownshipPark,
    notes: [],
  },
  {
    id: "tournament-jun-7",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-12u",
    type: "Tournament",
    title: "Tournament",
    date: "Sunday, June 7",
    shortDate: "Jun 7",
    time: "8:00 AM",
    startDateTime: "2026-06-07T08:00:00-04:00",
    endDateTime: "2026-06-07T12:00:00-04:00",
    location: "Williamstown Sports Complex",
    directionsUrl:
      "https://maps.google.com/?q=Williamstown%20Sports%20Complex",
    notes: [],
  },
  {
    id: "tournament-saturday-10u",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-10u",
    type: "Tournament",
    title: "Tournament Saturday",
    date: "Saturday, June 6",
    shortDate: "Jun 6",
    time: "8:00 AM",
    startDateTime: "2026-06-06T08:00:00-04:00",
    endDateTime: "2026-06-06T12:00:00-04:00",
    location: "",
    directionsUrl:
      "https://maps.google.com/?q=Williamstown%20Sports%20Complex",
    notes: [],
  },
  {
    id: "team-meeting-10u",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-10u",
    type: "Meeting",
    title: "Team Meeting",
    date: "Monday, June 8",
    shortDate: "Jun 8",
    time: "6:30 PM",
    startDateTime: "2026-06-08T18:30:00-04:00",
    endDateTime: "2026-06-08T19:15:00-04:00",
    location: "Clubhouse",
    directionsUrl: "https://maps.google.com/?q=Clubhouse",
    notes: [],
  },
  {
    id: "offseason-training-hs",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-hs",
    type: "Training",
    title: "Offseason Training",
    date: "Coming soon",
    shortDate: "Coming soon",
    time: "TBD",
    location: "TBD",
    directionsUrl: "https://maps.google.com/?q=Black%20Diamonds%20Football",
    notes: [],
  },
  {
    id: "tournament-saturday-14u",
    organizationId: "black-diamonds",
    teamId: "black-diamonds-14u",
    type: "Tournament",
    title: "Tournament Saturday",
    date: "Saturday, June 6",
    shortDate: "Jun 6",
    time: "8:00 AM",
    startDateTime: "2026-06-06T08:00:00-04:00",
    endDateTime: "2026-06-06T12:00:00-04:00",
    location: "Williamstown Sports Complex",
    directionsUrl:
      "https://maps.google.com/?q=Williamstown%20Sports%20Complex",
    notes: [],
  },
  {
    id: "board-meeting-monday",
    organizationId: "black-diamonds",
    type: "Meeting",
    title: "Board Meeting Monday",
    date: "Monday, June 8",
    shortDate: "Jun 8",
    time: "7:00 PM",
    startDateTime: "2026-06-08T19:00:00-04:00",
    endDateTime: "2026-06-08T20:00:00-04:00",
    location: "Clubhouse",
    directionsUrl: "https://maps.google.com/?q=Clubhouse",
    notes: [],
  },
];

export function getEventById(eventId: string) {
  return events.find((event) => event.id === eventId);
}

export function getEventsByIds(eventIds?: string[] | null) {
  const safeEventIds = Array.isArray(eventIds) ? eventIds : [];

  return safeEventIds
    .map((eventId) => getEventById(eventId))
    .filter((event): event is GameDayEvent => Boolean(event));
}

export function getEventsByOrganizationId(organizationId: string) {
  return events.filter((event) => event.organizationId === organizationId);
}

export function getEventsByTeamIds(teamIds?: string[] | null) {
  const safeTeamIds = Array.isArray(teamIds) ? teamIds : [];
  const teamIdSet = new Set(safeTeamIds);

  return events.filter(
    (event) => event.teamId && teamIdSet.has(event.teamId),
  );
}
