import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="rounded-[32px] border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-8 shadow-[var(--shadow)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
            Lantern Prompter
          </p>
          <h1 className="mt-3 text-4xl font-semibold">
            Choose your control mode
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--ink-soft)]">
            Use this device as the teleprompter screen, or open the remote
            controller on a phone on the same Wi-Fi.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/library"
            className="group rounded-[28px] border border-[color:var(--line)] bg-white/70 p-6 shadow-[var(--shadow)] transition hover:-translate-y-1"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
              Teleprompter
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Script Library & Prompter
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Create scripts, open the prompter view, and generate a remote link.
            </p>
            <div className="mt-6 inline-flex items-center rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white">
              Open Teleprompter
            </div>
          </Link>

          <Link
            href="/remote"
            className="group rounded-[28px] border border-[color:var(--line)] bg-white/70 p-6 shadow-[var(--shadow)] transition hover:-translate-y-1"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
              Remote
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Remote Controller
            </h2>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Enter the session link from the prompter to control playback.
            </p>
            <div className="mt-6 inline-flex items-center rounded-full bg-[color:var(--accent-2)] px-4 py-2 text-sm font-semibold text-white">
              Open Remote
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
