export type ParentGuardian = {
  id: string;
  parentId?: string;
  parentUid?: string;
  ownerUid?: string;
  createdByUid?: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  athleteIds: string[];
  organizationIds: string[];
  createdAt?: string;
  source?: string;
  updatedAt?: string;
};

export const currentParentId = "jennifer-smith";

export const parents: ParentGuardian[] = [
  {
    id: "jennifer-smith",
    firstName: "Jennifer",
    lastName: "Smith",
    name: "Jennifer Smith",
    email: "jennifer-smith@example.com",
    phone: "555-0101",
    athleteIds: ["emma-smith", "olivia-smith", "mason-smith"],
    organizationIds: ["black-diamonds"],
  },
  {
    id: "sarah-jones-parent",
    firstName: "Sarah",
    lastName: "Jones",
    name: "Sarah's Parent",
    email: "sarah-family@example.com",
    phone: "555-0102",
    athleteIds: ["sarah-jones"],
    organizationIds: ["black-diamonds"],
  },
  {
    id: "katie-brown-parent",
    firstName: "Katie",
    lastName: "Brown",
    name: "Katie's Parent",
    email: "katie-family@example.com",
    phone: "555-0103",
    athleteIds: ["katie-brown"],
    organizationIds: ["black-diamonds"],
  },
];

export function getParentById(parentId: string) {
  return parents.find((parent) => parent.id === parentId);
}

export function getCurrentParent() {
  return getParentById(currentParentId) ?? parents[0];
}
