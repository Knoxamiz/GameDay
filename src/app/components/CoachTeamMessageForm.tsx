"use client";

import { useState } from "react";
import type { MessageAudience, MessagePriority } from "../data/messages";

type CoachTeamMessageFormProps = {
  teamId: string;
};

type CoachTeamMessageResponse = {
  error?: string;
  id?: string;
  message?: string;
};

export default function CoachTeamMessageForm({
  teamId,
}: CoachTeamMessageFormProps) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] =
    useState<MessagePriority>("Informational");
  const [selectedAudience, setSelectedAudience] = useState<MessageAudience[]>([
    "parent",
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleAudience(audience: MessageAudience) {
    setSelectedAudience((currentAudience) =>
      currentAudience.includes(audience)
        ? currentAudience.filter((item) => item !== audience)
        : [...currentAudience, audience],
    );
  }

  async function sendMessage() {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/coach/messages", {
        body: JSON.stringify({
          audience: selectedAudience,
          content,
          priority,
          subject,
          teamId,
        }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | CoachTeamMessageResponse
        | null;

      if (!response.ok) {
        throw new Error(body?.error ?? "Could not send this message.");
      }

      setSubject("");
      setContent("");
      setMessage(body?.message ?? "Message sent.");
      window.location.reload();
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not send this message.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-white/10 bg-slate-950/40 p-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Audience
          </span>
          <div className="mt-1 flex flex-wrap gap-2">
            {(["parent", "coach"] satisfies MessageAudience[]).map(
              (audience) => (
                <label
                  className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-slate-950/50 px-2.5 py-1.5 text-xs font-black text-slate-200"
                  key={audience}
                >
                  <input
                    checked={selectedAudience.includes(audience)}
                    className="size-3"
                    onChange={() => toggleAudience(audience)}
                    type="checkbox"
                  />
                  {audience === "parent" ? "Parents" : "Coaches"}
                </label>
              ),
            )}
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] font-bold uppercase text-slate-400">
            Priority
          </span>
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
            onChange={(event) =>
              setPriority(event.target.value as MessagePriority)
            }
            value={priority}
          >
            <option value="Informational">Informational</option>
            <option value="Important">Important</option>
            <option value="Critical">Critical</option>
          </select>
        </label>
      </div>

      <label className="mt-2 block">
        <span className="text-[11px] font-bold uppercase text-slate-400">
          Title
        </span>
        <input
          className="mt-1 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
          onChange={(event) => setSubject(event.target.value)}
          value={subject}
        />
      </label>

      <label className="mt-2 block">
        <span className="text-[11px] font-bold uppercase text-slate-400">
          Message
        </span>
        <textarea
          className="mt-1 min-h-16 w-full rounded-md border border-white/15 bg-slate-950/70 px-2.5 py-2 text-sm font-semibold text-white outline-none focus:border-blue-400"
          onChange={(event) => setContent(event.target.value)}
          value={content}
        />
      </label>

      {message && (
        <p className="mt-2 rounded-md border border-blue-300/20 bg-blue-500/10 p-2 text-xs font-semibold text-blue-100">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md border border-red-300/20 bg-red-500/10 p-2 text-xs font-semibold text-red-100">
          {error}
        </p>
      )}

      <button
        className="mt-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        onClick={() => void sendMessage()}
        type="button"
      >
        {isSaving ? "Sending..." : "Send message"}
      </button>
    </div>
  );
}
