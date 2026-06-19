"use client";

import { useState } from "react";

type AdminJoinLinkButtonProps = {
  className?: string;
  errorMessage?: string;
  joinPath: string;
  label?: string;
  successMessage?: string;
};

export default function AdminJoinLinkButton({
  className,
  errorMessage = "Could not copy the join link.",
  joinPath,
  label = "Copy join link",
  successMessage = "Join link copied.",
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
            setMessage(successMessage);
          } catch {
            setMessage(errorMessage);
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
