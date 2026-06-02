export type AttendanceStatus = "Attending" | "Unknown" | "Not Attending";

export type AttendanceRecord = {
  athleteId: string;
  status: AttendanceStatus;
};

export type GameDayEvent = {
  id: string;
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
  attendance: {
    total: number;
    attending: number;
    unknown: number;
    notAttending: number;
    records: AttendanceRecord[];
  };
};

const practiceTimeRange = "6:00 PM - 7:30 PM";
const winslowTownshipPark = {
  location: "Winslow Township Park",
  directionsUrl: "https://maps.google.com/?q=Winslow%20Township%20Park",
};

export const events: GameDayEvent[] = [
  {
    id: "practice-jun-2",
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
    attendance: {
      total: 22,
      attending: 18,
      unknown: 2,
      notAttending: 2,
      records: [
        {
          athleteId: "emma-smith",
          status: "Attending",
        },
        {
          athleteId: "olivia-smith",
          status: "Attending",
        },
        {
          athleteId: "sarah-jones",
          status: "Unknown",
        },
        {
          athleteId: "katie-brown",
          status: "Not Attending",
        },
      ],
    },
  },
  {
    id: "practice-jun-5",
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
    attendance: {
      total: 22,
      attending: 0,
      unknown: 22,
      notAttending: 0,
      records: [],
    },
  },
  {
    id: "tournament-jun-7",
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
    attendance: {
      total: 22,
      attending: 0,
      unknown: 22,
      notAttending: 0,
      records: [],
    },
  },
  {
    id: "tournament-saturday-10u",
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
    attendance: {
      total: 18,
      attending: 0,
      unknown: 18,
      notAttending: 0,
      records: [],
    },
  },
  {
    id: "team-meeting-10u",
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
    attendance: {
      total: 18,
      attending: 0,
      unknown: 18,
      notAttending: 0,
      records: [],
    },
  },
  {
    id: "offseason-training-hs",
    teamId: "black-diamonds-hs",
    type: "Training",
    title: "Offseason Training",
    date: "Coming soon",
    shortDate: "Coming soon",
    time: "TBD",
    location: "TBD",
    directionsUrl: "https://maps.google.com/?q=Black%20Diamonds%20Football",
    notes: [],
    attendance: {
      total: 31,
      attending: 0,
      unknown: 31,
      notAttending: 0,
      records: [],
    },
  },
  {
    id: "tournament-saturday-14u",
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
    attendance: {
      total: 20,
      attending: 0,
      unknown: 20,
      notAttending: 0,
      records: [],
    },
  },
  {
    id: "board-meeting-monday",
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
    attendance: {
      total: 0,
      attending: 0,
      unknown: 0,
      notAttending: 0,
      records: [],
    },
  },
];

export const adminUpcomingEventIds = [
  "practice-jun-2",
  "tournament-saturday-14u",
  "board-meeting-monday",
];

export function getEventById(eventId: string) {
  return events.find((event) => event.id === eventId);
}

export function getEventsByIds(eventIds: string[]) {
  return eventIds
    .map((eventId) => getEventById(eventId))
    .filter((event): event is GameDayEvent => Boolean(event));
}
