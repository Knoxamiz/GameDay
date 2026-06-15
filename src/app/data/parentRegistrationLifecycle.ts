export type ParentRegistrationCorrection = {
  athleteFirstName: string;
  athleteLastName: string;
  grade: string;
  parentEmail: string;
  parentName: string;
  parentPhone: string;
  school: string;
};

export type ParentLifecycleRequestStatus =
  | "approved"
  | "pending"
  | "rejected";

export type ParentRegistrationChangeRequest = {
  correction: ParentRegistrationCorrection;
  requestedAt: string;
  requestedByUid: string;
  resolvedAt?: string;
  resolvedByUid?: string;
  status: ParentLifecycleRequestStatus;
};

export type ParentRegistrationWithdrawalRequest = {
  reason?: string;
  requestedAt: string;
  requestedByUid: string;
  resolvedAt?: string;
  resolvedByUid?: string;
  status: ParentLifecycleRequestStatus;
};

export type ParentRegistrationLifecyclePayload =
  | {
      actionType: "correction";
      correction: ParentRegistrationCorrection;
    }
  | {
      actionType: "withdrawal";
      reason?: string;
    };

export type ParentRegistrationLifecycleResult = {
  message: string;
  mode: "requested" | "updated" | "withdrawn";
  registrationId: string;
  source: "firestore";
};
