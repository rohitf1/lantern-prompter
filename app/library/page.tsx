"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  createScript,
  deleteScript,
  duplicateScript,
  exportScripts,
  importScripts,
  listScripts,
  saveScript,
} from "@/modules/storage/db";
import type { Script } from "@/types/messages";

const DEFAULT_SAMPLE = `Welcome to Lantern Prompter!\n\n- Create or import your scripts on the left.\n- Edit your script here. Autosave runs as you type.\n- Click “Open in Prompter” to start the live reading view.\n- Scan the QR code to control it from your phone.\n`;

export default function LibraryPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveLabel, setSaveLabel] = useState("Saved");
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const activeScript = useMemo(
    () => scripts.find((script) => script.id === activeId) || null,
    [scripts, activeId]
  );

  useEffect(() => {
    const load = async () => {
      const existing = await listScripts();
      if (existing.length === 0) {
        const sample = createScript("Welcome Script");
        sample.content = DEFAULT_SAMPLE;
        await saveScript(sample);
        setScripts([sample]);
        setActiveId(sample.id);
        return;
      }
      setScripts(existing);
      setActiveId(existing[0].id);
    };
    load();
  }, []);


  useEffect(() => {
    if (!activeScript) return;
    setDraftTitle(activeScript.title);
    setDraftContent(activeScript.content);
    setSaveLabel("Saved");
  }, [activeScript?.id]);

  useEffect(() => {
    if (!activeScript) return;
    const isDirty =
      draftTitle !== activeScript.title ||
      draftContent !== activeScript.content;
    if (!isDirty) {
      setSaveLabel("Saved");
      return;
    }
    setSaveLabel("Saving...");
    const timeout = window.setTimeout(async () => {
      const updated: Script = {
        ...activeScript,
        title: draftTitle.trim() || "Untitled",
        content: draftContent,
      };
      await saveScript(updated);
      const refreshed = await listScripts();
      setScripts(refreshed);
      setSaveLabel("Saved just now");
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [draftTitle, draftContent, activeScript]);

  const handleCreate = async () => {
    const script = createScript("New Script");
    await saveScript(script);
    const refreshed = await listScripts();
    setScripts(refreshed);
    setActiveId(script.id);
  };

  const handleDuplicate = async () => {
    if (!activeScript) return;
    await duplicateScript(activeScript);
    const refreshed = await listScripts();
    setScripts(refreshed);
  };

  const handleDelete = async () => {
    if (!activeScript) return;
    const confirmed = window.confirm(
      `Delete “${activeScript.title}”? This cannot be undone.`
    );
    if (!confirmed) return;
    await deleteScript(activeScript.id);
    const refreshed = await listScripts();
    setScripts(refreshed);
    setActiveId(refreshed[0]?.id ?? null);
  };

  const handleExport = async () => {
    const json = await exportScripts();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teleprompter-scripts-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const refreshed = await importScripts(text);
    setScripts(refreshed);
    setActiveId(refreshed[0]?.id ?? null);
    event.target.value = "";
  };

  const filtered = scripts.filter((script) =>
    script.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen px-6 py-8">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            Local Teleprompter Studio
          </p>
          <h1 className="text-3xl font-semibold">Lantern Prompter</h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--ink-soft)]">
            Build your scripts on the host device, then open the prompter view
            and control it from your phone on the same Wi-Fi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm font-medium shadow-[var(--shadow)]"
            onClick={handleExport}
          >
            Export Scripts
          </button>
          <button
            className="rounded-full border border-[color:var(--line)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm font-medium"
            onClick={() => importInputRef.current?.click()}
          >
            Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </header>

      <section className="mx-auto mt-8 grid w-full max-w-6xl gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-5 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scripts</h2>
            <button
              onClick={handleCreate}
              className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-sm font-semibold text-white"
            >
              New
            </button>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scripts..."
            className="mt-4 w-full rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 py-2 text-sm"
          />
          <div className="mt-4 space-y-3">
            {filtered.map((script) => (
              <button
                key={script.id}
                onClick={() => setActiveId(script.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  activeId === script.id
                    ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                    : "border-transparent bg-white/70 hover:border-[color:var(--line)]"
                }`}
              >
                <div className="text-sm font-semibold">{script.title}</div>
                <div
                  className={`mt-1 text-xs ${
                    activeId === script.id
                      ? "text-white/80"
                      : "text-[color:var(--ink-soft)]"
                  }`}
                >
                  {new Date(script.updatedAt).toLocaleString()}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-[color:var(--ink-soft)]">
                No scripts match that search.
              </p>
            )}
          </div>
        </aside>

        <section className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--surface-strong)] p-6 shadow-[var(--shadow)]">
          {activeScript ? (
            <div className="flex h-full flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="w-full max-w-lg border-b border-[color:var(--line)] bg-transparent text-2xl font-semibold outline-none"
                    placeholder="Script title"
                  />
                  <p className="text-xs text-[color:var(--ink-soft)]">
                    {saveLabel}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    className="rounded-full bg-[color:var(--accent-2)] px-4 py-2 text-sm font-semibold text-white"
                    href={`/prompter?scriptId=${activeScript.id}`}
                  >
                    Open in Prompter
                  </Link>
                  <button
                    onClick={handleDuplicate}
                    className="rounded-full border border-[color:var(--line)] px-3 py-2 text-sm"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-full border border-red-200 px-3 py-2 text-sm text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <textarea
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                className="min-h-[360px] flex-1 rounded-2xl border border-[color:var(--line)] bg-white/80 p-4 text-base leading-relaxed"
                placeholder="Paste or type your script here..."
              />

            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-[color:var(--ink-soft)]">
              Create or select a script to begin.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
