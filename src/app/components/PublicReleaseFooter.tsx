import Link from "next/link";

export default function PublicReleaseFooter() {
  return (
    <footer className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-5 text-xs font-bold text-slate-400 sm:px-6">
      <Link className="hover:text-blue-300" href="/privacy">
        Privacy
      </Link>
      <span className="text-slate-700">/</span>
      <Link className="hover:text-blue-300" href="/terms">
        Terms
      </Link>
      <span className="text-slate-700">/</span>
      <Link className="hover:text-blue-300" href="/support">
        Support
      </Link>
      <span className="text-slate-700">/</span>
      <Link className="hover:text-blue-300" href="/account/delete">
        Delete account
      </Link>
    </footer>
  );
}
