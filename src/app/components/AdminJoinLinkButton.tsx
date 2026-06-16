"use client";

import { useState } from "react";

type AdminJoinLinkButtonProps = {
  className?: string;
  joinPath: string;
  label?: string;
};

export default function AdminJoinLinkButton({
  className,
  joinPath,
  label = "Copy join link",
}: AdminJoinLinkButtonProps) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <button
        className={className}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${window.location.origin}${joinPath}`,
            );
            setMessage("Join link copied.");
          } catch {
            setMessage("Could not copy the join link.");
          }
        }}
        type="button"
      >
        {label}
      </button>
      {message && (
        <p className="mt-2 text-xs font-semibold text-slate-300">{message}</p>
      )}
    </div>
  );
}
