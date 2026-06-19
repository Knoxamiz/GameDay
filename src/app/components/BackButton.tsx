"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  fallbackHref: string;
  label?: string;
};

export default function BackButton({
  fallbackHref,
  label = "Last page",
}: BackButtonProps) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-black text-white shadow-sm hover:bg-white/10"
      onClick={goBack}
      type="button"
    >
      <span aria-hidden="true" className="text-base leading-none">
        &larr;
      </span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
