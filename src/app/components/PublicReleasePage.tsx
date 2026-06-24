import Link from "next/link";
import PublicReleaseFooter from "./PublicReleaseFooter";

type PublicReleasePageSection = {
  body: string[];
  title: string;
};

type PublicReleasePageProps = {
  cta?: {
    href: string;
    label: string;
  };
  eyebrow: string;
  intro: string;
  sections: PublicReleasePageSection[];
  title: string;
};

export default function PublicReleasePage({
  cta,
  eyebrow,
  intro,
  sections,
  title,
}: PublicReleasePageProps) {
  return (
    <main className="gd-dark-scope min-h-screen text-white">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-3 py-2.5 sm:px-5">
          <Link className="text-lg font-black text-white" href="/">
            GameDay
          </Link>
          <Link
            className="rounded-md border border-blue-300/25 bg-blue-500/10 px-2.5 py-1.5 text-xs font-black text-blue-100 hover:bg-blue-500/20"
            href="/login"
          >
            Log in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-3 py-4 sm:px-5">
        <div className="gd-card-light rounded-lg p-3 sm:p-4">
          <p className="text-xs font-black uppercase tracking-wide text-blue-300">
            {eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
            {intro}
          </p>
          {cta && (
            <Link
              className="mt-4 inline-flex rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-500"
              href={cta.href}
            >
              {cta.label}
            </Link>
          )}
        </div>

        <div className="mt-3 grid gap-2.5">
          {sections.map((section) => (
            <section className="gd-card-light rounded-lg p-3" key={section.title}>
              <h2 className="text-base font-black">{section.title}</h2>
              <div className="mt-2 space-y-2 text-sm font-semibold leading-6 text-slate-300">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <PublicReleaseFooter />
    </main>
  );
}
