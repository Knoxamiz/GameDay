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

export const currentParentId = "";

export const parents: ParentGuardian[] = [];

const emptyParent: ParentGuardian = {
  athleteIds: [],
  email: "",
  firstName: "Parent",
  id: "",
  lastName: "",
  name: "Parent",
  organizationIds: [],
  phone: "",
};

export function getParentById(parentId: string) {
  return parents.find((parent) => parent.id === parentId);
}

export function getCurrentParent() {
  return getParentById(currentParentId) ?? emptyParent;
}
