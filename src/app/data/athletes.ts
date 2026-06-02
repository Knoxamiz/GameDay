export type AthleteEvent = {
  title: string;
  date: string;
  time: string;
  location: string;
};

export type Athlete = {
  id: string;
  name: string;
  team: string;
  nextEvent: AthleteEvent & {
    directionsUrl: string;
  };
  transportation: {
    status: string;
    details: string;
  };
  teamUpdates: string[];
  upcomingEvents: AthleteEvent[];
  registrationStatus: {
    status: string;
    details: string;
  };
  coach: {
    name: string;
    contactUrl: string;
  };
};

export const athletes: Athlete[] = [
  {
    id: "emma-smith",
    name: "Emma Smith",
    team: "Black Diamonds 12U",
    nextEvent: {
      title: "Practice Tonight",
      date: "Today",
      time: "6:00 PM - 7:30 PM",
      location: "Winslow Township Park",
      directionsUrl: "https://maps.google.com/?q=Winslow%20Township%20Park",
    },
    transportation: {
      status: "Ride confirmed",
      details: "Jennifer is driving. Arrive by 5:45 PM with cleats and water.",
    },
    teamUpdates: [
      "Uniform pickup is Friday after practice.",
      "Bring both practice jersey colors this week.",
    ],
    upcomingEvents: [
      {
        title: "Practice Tonight",
        date: "Today",
        time: "6:00 PM - 7:30 PM",
        location: "Winslow Township Park",
      },
      {
        title: "Tournament Saturday",
        date: "Saturday",
        time: "8:00 AM",
        location: "Williamstown Sports Complex",
      },
    ],
    registrationStatus: {
      status: "Complete",
      details: "Waiver, emergency contact, and uniform size are on file.",
    },
    coach: {
      name: "Coach Rivera",
      contactUrl: "mailto:coach.rivera@example.com",
    },
  },
  {
    id: "olivia-smith",
    name: "Olivia Smith",
    team: "Black Diamonds 10U",
    nextEvent: {
      title: "Tournament Saturday",
      date: "Saturday",
      time: "8:00 AM",
      location: "Williamstown Sports Complex",
      directionsUrl:
        "https://maps.google.com/?q=Williamstown%20Sports%20Complex",
    },
    transportation: {
      status: "Needs confirmation",
      details: "Please confirm whether Olivia is riding with family or team.",
    },
    teamUpdates: [
      "Tournament schedule was updated this morning.",
      "Players should arrive 45 minutes before first game.",
    ],
    upcomingEvents: [
      {
        title: "Tournament Saturday",
        date: "Saturday",
        time: "8:00 AM",
        location: "Williamstown Sports Complex",
      },
      {
        title: "Team Meeting",
        date: "Monday",
        time: "6:30 PM",
        location: "Clubhouse",
      },
    ],
    registrationStatus: {
      status: "Action needed",
      details: "Emergency contact form still needs parent signature.",
    },
    coach: {
      name: "Coach Bennett",
      contactUrl: "mailto:coach.bennett@example.com",
    },
  },
  {
    id: "mason-smith",
    name: "Mason Smith",
    team: "Black Diamonds HS",
    nextEvent: {
      title: "No Upcoming Events",
      date: "TBD",
      time: "Schedule pending",
      location: "Location TBD",
      directionsUrl: "https://maps.google.com/?q=Black%20Diamonds%20Football",
    },
    transportation: {
      status: "Not needed yet",
      details: "Transportation details will appear when the next event is set.",
    },
    teamUpdates: [
      "Offseason training dates will be posted soon.",
      "Registration opens next week for returning athletes.",
    ],
    upcomingEvents: [
      {
        title: "Offseason Training",
        date: "Coming soon",
        time: "TBD",
        location: "TBD",
      },
    ],
    registrationStatus: {
      status: "Pending",
      details: "Season registration has not opened yet.",
    },
    coach: {
      name: "Coach Daniels",
      contactUrl: "mailto:coach.daniels@example.com",
    },
  },
];

export function getAthleteById(athleteId: string) {
  return athletes.find((athlete) => athlete.id === athleteId);
}
