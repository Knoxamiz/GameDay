"use client";

import { useState } from "react";

type AdminAnnouncementFormProps = {
  activeOrganizationId: string;
};

type AdminAnnouncementResponse = {
  error?: string;
  id?: string;
  message?: string;
};

export default function AdminAnnouncementForm({
  activeOrganizationId,
}: AdminAnnouncementFormProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveAnnouncement() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/announcements", {
        body: JSON.stringify({
          activeOrganizationId,
          content,
          organizationId: activeOrganizationId,
          subject,
        }),
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | AdminAnnouncementResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not create announcement.");
      }

      setSubject("");
      setContent("");
      setMessage(body?.message ?? "Announcement created.");
      window.location.reload();
    } catch (announcementError) {
      setError(
        announcementError instanceof Error
          ? announcementError.message
          : "Could not create announcement.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <details
      className="gd-card-light gd-card-interactive group overflow-hidden rounded-lg"
      id="create-announcement"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-base font-black text-slate-950">
            Create announcement
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-slate-500">
            Post an organization update for families and staff.
          </span>
        </span>
        <span className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white transition group-open:hidden">
          Create +
        </span>
        <span className="hidden text-base font-black text-blue-700 transition group-open:block group-open:rotate-90">
          &gt;
        </span>
      </summary>

      {message && (
        <p className="mx-3 mt-2 rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs font-semibold text-blue-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mx-3 mt-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-3 border-t border-blue-100/70 px-3 pb-3 pt-2.5">
        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-500">
            Title
          </span>
          <input
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase text-slate-500">
            Details
          </span>
          <textarea
            className="mt-2 min-h-16 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
        </label>

        <button
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isSaving}
          onClick={() => void saveAnnouncement()}
          type="button"
        >
          {isSaving ? "Creating..." : "Create Announcement"}
        </button>
      </div>
    </details>
  );
}
