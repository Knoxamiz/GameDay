import type { Organization } from "../data/organizations";

type AdminOrganizationSelectorProps = {
  activeOrganizationId?: string;
  action: string;
  compact?: boolean;
  organizations: Organization[];
};

export default function AdminOrganizationSelector({
  activeOrganizationId,
  action,
  compact = false,
  organizations,
}: AdminOrganizationSelectorProps) {
  if (organizations.length <= 1) {
    return null;
  }

  return (
    <form
      action={action}
      className={
        compact
          ? "flex w-full items-end gap-2 sm:w-auto"
          : "gd-card-dark mt-3 rounded-lg p-3"
      }
      method="get"
    >
      <label className={compact ? "min-w-0 flex-1 sm:min-w-64" : "block"}>
        <span className={compact ? "sr-only" : "text-sm font-semibold text-slate-300"}>
          Active workspace
        </span>
        <select
          className={`${compact ? "" : "mt-1"} w-full rounded-md border border-white/15 bg-slate-950/75 px-3 py-2 text-white`}
          defaultValue={activeOrganizationId ?? ""}
          name="organizationId"
          required
        >
          <option disabled value="">
            Choose a workspace
          </option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className={
          compact
            ? "shrink-0 rounded-md bg-blue-500 px-3 py-2 text-sm font-black text-white"
            : "mt-3 w-full rounded-md bg-blue-500 py-2.5 text-sm font-black text-white"
        }
        type="submit"
      >
        {compact ? "Switch" : "Use Workspace"}
      </button>
      {!compact && !activeOrganizationId && (
        <p className="mt-3 text-sm text-yellow-200">
          Choose a workspace before viewing or changing admin data.
        </p>
      )}
    </form>
  );
}
