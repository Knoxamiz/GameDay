export type AthleteEvent = {
  type: string;
  title: string;
  date: string;
  time: string;
  location: string;
};

export type RegistrationRequirement = {
  label: string;
  status: "Complete" | "Missing";
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
    options: string[];
  };
  teamUpdates: string[];
  upcomingEvents: AthleteEvent[];
  registrationStatus: {
    status: string;
    details: string;
    requirements: RegistrationRequirement[];
  };
  coach: {
    name: string;
    assistants: string[];
    contactUrl: string;
  };
};

export const athletes: Athlete[] = [
  {
    id: "emma-smith",
    name: "Emma Smith",
    team: "Black Diamonds 12U",
    nextEvent: {
      type: "Practice",
      title: "Practice Tonight",
      date: "Tuesday, June 2",
      time: "6:00 PM - 7:30 PM",
      location: "Winslow Township Park",
      directionsUrl: "https://maps.google.com/?q=Winslow%20Township%20Park",
    },
    transportation: {
      status: "Driving Self",
      details: "Jennifer is driving. Arrive by 5:45 PM.",
      options: ["Driving Self", "Need Ride", "Can Offer Ride"],
    },
    teamUpdates: [
      "Bring water bottle",
      "Wear black jersey",
      "Tournament roster posted",
    ],
    upcomingEvents: [
      {
        type: "Practice",
        title: "Practice",
        date: "Jun 2",
        time: "6:00 PM - 7:30 PM",
        location: "Winslow Township Park",
      },
      {
        type: "Practice",
        title: "Practice",
        date: "Jun 5",
        time: "6:00 PM - 7:30 PM",
        location: "Winslow Township Park",
      },
      {
        type: "Tournament",
        title: "Tournament",
        date: "Jun 7",
        time: "8:00 AM",
        location: "Williamstown Sports Complex",
      },
    ],
    registrationStatus: {
      status: "Missing Physical",
      details: "One required document still needs to be submitted.",
      requirements: [
        {
          label: "Birth Certificate",
          status: "Complete",
        },
        {
          label: "Waiver",
          status: "Complete",
        },
        {
          label: "Photo",
          status: "Complete",
        },
        {
          label: "Physical",
          status: "Missing",
        },
      ],
    },
    coach: {
      name: "Coach Mick",
      assistants: ["Assistant Coach Jen"],
      contactUrl: "mailto:coach.mick@example.com",
    },
  },
  {
    id: "olivia-smith",
    name: "Olivia Smith",
    team: "Black Diamonds 10U",
    nextEvent: {
      type: "Tournament",
      title: "Tournament Saturday",
      date: "Saturday",
      time: "8:00 AM",
      location: "",
      directionsUrl:
        "https://maps.google.com/?q=Williamstown%20Sports%20Complex",
    },
    transportation: {
      status: "Needs confirmation",
      details: "Please confirm whether Olivia is riding with family or team.",
      options: ["Driving Self", "Need Ride", "Can Offer Ride"],
    },
    teamUpdates: [
      "Tournament schedule was updated this morning.",
      "Players should arrive 45 minutes before first game.",
    ],
    upcomingEvents: [
      {
        type: "Tournament",
        title: "Tournament Saturday",
        date: "Saturday",
        time: "8:00 AM",
        location: "Williamstown Sports Complex",
      },
      {
        type: "Meeting",
        title: "Team Meeting",
        date: "Monday",
        time: "6:30 PM",
        location: "Clubhouse",
      },
    ],
    registrationStatus: {
      status: "Action needed",
      details: "Emergency contact form still needs parent signature.",
      requirements: [
        {
          label: "Birth Certificate",
          status: "Complete",
        },
        {
          label: "Waiver",
          status: "Missing",
        },
        {
          label: "Photo",
          status: "Complete",
        },
        {
          label: "Physical",
          status: "Complete",
        },
      ],
    },
    coach: {
      name: "Coach Bennett",
      assistants: ["Assistant Coach Rae"],
      contactUrl: "mailto:coach.bennett@example.com",
    },
  },
  {
    id: "mason-smith",
    name: "Mason Smith",
    team: "Black Diamonds HS",
    nextEvent: {
      type: "",
      title: "No Upcoming Events",
      date: "TBD",
      time: "",
      location: "",
      directionsUrl: "https://maps.google.com/?q=Black%20Diamonds%20Football",
    },
    transportation: {
      status: "Not needed yet",
      details: "Transportation details will appear when the next event is set.",
      options: ["Driving Self", "Need Ride", "Can Offer Ride"],
    },
    teamUpdates: [
      "Offseason training dates will be posted soon.",
      "Registration opens next week for returning athletes.",
    ],
    upcomingEvents: [
      {
        type: "Training",
        title: "Offseason Training",
        date: "Coming soon",
        time: "TBD",
        location: "TBD",
      },
    ],
    registrationStatus: {
      status: "Pending",
      details: "Season registration has not opened yet.",
      requirements: [
        {
          label: "Birth Certificate",
          status: "Missing",
        },
        {
          label: "Waiver",
          status: "Missing",
        },
        {
          label: "Photo",
          status: "Missing",
        },
        {
          label: "Physical",
          status: "Missing",
        },
      ],
    },
    coach: {
      name: "Coach Daniels",
      assistants: [],
      contactUrl: "mailto:coach.daniels@example.com",
    },
  },
];

export function getAthleteById(athleteId: string) {
  return athletes.find((athlete) => athlete.id === athleteId);
}
