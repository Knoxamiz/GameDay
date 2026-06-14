import { getFirebaseAdminConfig } from "../infrastructure/firebase";
import { createFirestoreRepositories } from "../infrastructure/firebaseRepositories";

export type OrganizationContext = {
  count: number;
  label: string;
};

function uniqueOrganizationIds(organizationIds: string[]) {
  return [
    ...new Set(
      organizationIds.map((organizationId) => organizationId.trim()).filter(Boolean),
    ),
  ];
}

export async function getOrganizationContext(
  organizationIds: string[],
): Promise<OrganizationContext | undefined> {
  const scopedOrganizationIds = uniqueOrganizationIds(organizationIds);

  if (scopedOrganizationIds.length === 0) {
    return undefined;
  }

  if (!getFirebaseAdminConfig()) {
    return {
      count: scopedOrganizationIds.length,
      label: scopedOrganizationIds.join(", "),
    };
  }

  try {
    const repositories = createFirestoreRepositories();
    const organizations = await Promise.all(
      scopedOrganizationIds.map((organizationId) =>
        repositories.organizations.getById(organizationId),
      ),
    );
    const organizationNameById = new Map(
      organizations.flatMap((organization) =>
        organization ? [[organization.id, organization.name]] : [],
      ),
    );

    return {
      count: scopedOrganizationIds.length,
      label: scopedOrganizationIds
        .map(
          (organizationId) =>
            organizationNameById.get(organizationId) ?? organizationId,
        )
        .join(", "),
    };
  } catch (error) {
    console.warn("Could not resolve organization display names.", error);
    return {
      count: scopedOrganizationIds.length,
      label: scopedOrganizationIds.join(", "),
    };
  }
}
