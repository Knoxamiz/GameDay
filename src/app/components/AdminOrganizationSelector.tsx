import type { Organization } from "../data/organizations";

type AdminOrganizationSelectorProps = {
  activeOrganizationId?: string;
  action: string;
  organizations: Organization[];
};

export default function AdminOrganizationSelector({
  activeOrganizationId,
  action,
  organizations,
}: AdminOrganizationSelectorProps) {
  if (organizations.length <= 1) {
    return null;
  }

  return (
    <form
      action={action}
      className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-4"
      method="get"
    >
      <label className="block">
        <span className="text-sm font-semibold text-slate-300">
          Active organization
        </span>
        <select
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
          defaultValue={activeOrganizationId ?? ""}
          name="organizationId"
          required
        >
          <option disabled value="">
            Choose an organization
          </option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="mt-3 w-full rounded-xl bg-blue-500 py-3 font-semibold text-white"
        type="submit"
      >
        Use Organization
      </button>
      {!activeOrganizationId && (
        <p className="mt-3 text-sm text-yellow-200">
          Choose an organization before viewing or changing admin data.
        </p>
      )}
    </form>
  );
}
