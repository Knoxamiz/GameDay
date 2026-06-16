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
    <section
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      id="create-announcement"
    >
      <div>
        <h2 className="text-xl font-black">Create Announcement</h2>
        <p className="mt-1 text-sm text-slate-500">
          Post an organization update for parents, coaches, and admins.
        </p>
      </div>

      {message && (
        <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-bold text-slate-700">Title</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setSubject(event.target.value)}
            value={subject}
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-700">Details</span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
        </label>

        <button
          className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isSaving}
          onClick={() => void saveAnnouncement()}
          type="button"
        >
          {isSaving ? "Creating..." : "Create Announcement"}
        </button>
      </div>
    </section>
  );
}
