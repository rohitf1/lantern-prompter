"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { joinSession } from "@/modules/sync/socket";
import type { Command, PrompterState } from "@/types/messages";

const SPEED_STEP = 6;
const FONT_STEP = 4;
const ALIGN_STEP = 20;
const FONT_OPTIONS = [
  { label: "Literata", value: "literata" },
  { label: "Space Grotesk", value: "grotesk" },
  { label: "Georgia", value: "georgia" },
  { label: "Times New Roman", value: "times" },
  { label: "Arial", value: "arial" },
];

export default function RemotePage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session") || "";
  const router = useRouter();
  const [state, setState] = useState<PrompterState | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const socketRef = useRef<ReturnType<typeof joinSession> | null>(null);
  const [manualEntry, setManualEntry] = useState("");
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const socket = joinSession({ sessionId, role: "remote" });
    socketRef.current = socket;

    socket.on("state:update", (payload: PrompterState) => {
      setState(payload);
    });

    socket.on("session:status", (status) => {
      setConnected(status.connectedPrompter && status.connectedRemote);
    });

    socket.on("session:replace", (payload) => {
      setStatusMessage(payload.message || "Remote connection replaced.");
    });

    socket.on("connect", () => {
      socket.emit("state:request");
    });

    socket.emit("state:request");

    return () => {
      socket.off("state:update");
      socket.off("session:status");
      socket.off("session:replace");
      socket.off("connect");
    };
  }, [sessionId]);

  const handleManualJoin = () => {
    const trimmed = manualEntry.trim();
    if (!trimmed) return;
    const sessionMatch = trimmed.match(/session=([A-Za-z0-9_-]+)/);
    const nextSession = sessionMatch ? sessionMatch[1] : trimmed;
    router.push(`/remote?session=${nextSession}`);
  };

  const sendCommand = (command: Command) => {
    if (!sessionId || !socketRef.current) return;
    socketRef.current.emit("command", command);
    if (navigator?.vibrate) {
      navigator.vibrate(12);
    }
    try {
      if (!audioRef.current) {
        const AudioCtor =
          window.AudioContext ||
          (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;
        audioRef.current = new AudioCtor();
      }
      if (audioRef.current.state === "suspended") {
        audioRef.current.resume();
      }
      const ctx = audioRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 640;
      gain.gain.setValueAtTime(0.0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.09);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    } catch {
      // Ignore audio failures.
    }
  };

  const title = state?.scriptTitle || "Waiting for script";

  return (
    <main className="min-h-screen bg-[#111018] px-5 py-6 text-white">
      <section className="mx-auto flex w-full max-w-md flex-col gap-5">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Remote Controller
          </p>
          <h1 className="mt-1 text-lg font-semibold">{title}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-400" : "bg-orange-400"
              }`}
            />
            <span>
              {connected ? "Connected" : "Waiting for prompter"}
            </span>
          </div>
          {statusMessage && (
            <p className="mt-2 text-xs text-orange-200">{statusMessage}</p>
          )}
        </header>

        <details className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-white/80">
            Text tools
          </summary>
          <div className="mt-3 grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/50">
              Font
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              value={state?.fontFamily ?? "literata"}
              onChange={(event) =>
                sendCommand({
                  type: "SET_FONT_FAMILY",
                  value: event.target.value,
                })
              }
            >
              {FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3 grid gap-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/50">
              Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={state?.textColor ?? "#ffffff"}
                onChange={(event) =>
                  sendCommand({
                    type: "SET_TEXT_COLOR",
                    value: event.target.value,
                  })
                }
                className="h-10 w-14 rounded-lg border border-white/10 bg-transparent p-0"
              />
              <span className="text-xs text-white/60">
                {state?.textColor ?? "#ffffff"}
              </span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border border-white/10 bg-slate-800/60 py-2 text-xs text-white"
              onClick={() => sendCommand({ type: "DEC_FONT", step: FONT_STEP })}
            >
              Font -
            </button>
            <button
              className="rounded-xl border border-white/10 bg-slate-800/60 py-2 text-xs text-white"
              onClick={() => sendCommand({ type: "INC_FONT", step: FONT_STEP })}
            >
              Font +
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              className="rounded-xl border border-white/10 bg-slate-800/60 py-2 text-xs text-white"
              onClick={() => sendCommand({ type: "SET_ALIGN", value: "left" })}
            >
              Left
            </button>
            <button
              className="rounded-xl border border-white/10 bg-slate-800/60 py-2 text-xs text-white"
              onClick={() => sendCommand({ type: "SET_ALIGN", value: "center" })}
            >
              Center
            </button>
            <button
              className="rounded-xl border border-white/10 bg-slate-800/60 py-2 text-xs text-white"
              onClick={() => sendCommand({ type: "SET_ALIGN", value: "right" })}
            >
              Right
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              className="rounded-xl border border-white/10 bg-slate-900/60 py-2 text-xs text-white"
              onClick={() =>
                sendCommand({ type: "NUDGE_ALIGN", deltaPx: -ALIGN_STEP })
              }
            >
              ◀︎ Nudge Left
            </button>
            <button
              className="rounded-xl border border-white/10 bg-slate-900/60 py-2 text-xs text-white"
              onClick={() =>
                sendCommand({ type: "NUDGE_ALIGN", deltaPx: ALIGN_STEP })
              }
            >
              Nudge Right ▶︎
            </button>
          </div>
          <button
            className="mt-3 w-full rounded-xl border border-white/10 bg-indigo-500/80 py-2 text-xs font-semibold text-white"
            onClick={() => sendCommand({ type: "TOGGLE_MIRROR" })}
          >
            Mirror {state?.mirror ? "On" : "Off"}
          </button>
          <p className="mt-2 text-xs text-white/60">
            {state?.fontSize ?? 0}px · {state?.align ?? "center"} · offset{" "}
            {state?.alignOffset ?? 0}px
          </p>
        </details>

        <div className="grid grid-cols-2 gap-3">
          <button
            className="rounded-3xl border border-white/10 bg-emerald-500/80 py-4 text-base font-semibold text-white"
            onClick={() => sendCommand({ type: "DEC_SPEED", step: SPEED_STEP })}
          >
            Speed -
          </button>
          <button
            className="rounded-3xl border border-white/10 bg-emerald-500/80 py-4 text-base font-semibold text-white"
            onClick={() => sendCommand({ type: "INC_SPEED", step: SPEED_STEP })}
          >
            Speed +
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 py-3 text-center text-sm text-white/80">
          {Math.round(state?.speed ?? 0)} px/s
        </div>

        <button
          className="rounded-3xl border border-white/10 bg-amber-400/90 py-4 text-base font-semibold text-black"
          onClick={() => sendCommand({ type: "RESET_SCROLL" })}
        >
          Go to Top
        </button>

        <button
          className="rounded-3xl bg-[color:var(--accent)] py-5 text-lg font-semibold text-white shadow-[var(--shadow)]"
          onClick={() => sendCommand({ type: "TOGGLE_PLAY" })}
        >
          {state?.isPlaying ? "Pause" : "Play"}
        </button>

        <button
          className="rounded-3xl border border-white/10 bg-sky-500/80 py-4 text-base font-semibold text-white"
          onClick={() => sendCommand({ type: "NUDGE_SCROLL", deltaPx: -180 })}
        >
          Nudge Up
        </button>
        <button
          className="rounded-3xl border border-white/10 bg-sky-500/80 py-4 text-base font-semibold text-white"
          onClick={() => sendCommand({ type: "NUDGE_SCROLL", deltaPx: 180 })}
        >
          Nudge Down
        </button>

        {!sessionId && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <p>Missing session ID. Paste a session link or ID below.</p>
            <div className="mt-3 flex flex-col gap-2">
              <input
                value={manualEntry}
                onChange={(event) => setManualEntry(event.target.value)}
                placeholder="Paste full URL or session ID"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
              <button
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black"
                onClick={handleManualJoin}
              >
                Join Session
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
