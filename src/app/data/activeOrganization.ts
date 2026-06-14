export const activeOrganizationQueryParameter = "organizationId";

export function getRequestedOrganizationId(
  value?: string | string[],
): string | undefined {
  const organizationId = Array.isArray(value) ? value[0] : value;
  const normalizedOrganizationId = organizationId?.trim();

  return normalizedOrganizationId || undefined;
}

export function withActiveOrganization(
  href: string,
  organizationId?: string,
) {
  if (!organizationId) {
    return href;
  }

  const url = new URL(href, "https://gameday.local");
  url.searchParams.set(activeOrganizationQueryParameter, organizationId);

  return `${url.pathname}${url.search}${url.hash}`;
}
