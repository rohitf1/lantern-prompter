"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import { getScript, getSettings, saveSettings } from "@/modules/storage/db";
import { getSocket, joinSession } from "@/modules/sync/socket";
import type { Command, PrompterState } from "@/types/messages";

const SPEED_STEP = 6;
const FONT_STEP = 4;
const FONT_FAMILIES: Record<string, string> = {
  literata: "var(--font-literata), Georgia, serif",
  grotesk: "var(--font-space-grotesk), Arial, sans-serif",
  georgia: "Georgia, serif",
  times: "\"Times New Roman\", Times, serif",
  arial: "Arial, Helvetica, sans-serif",
};
const FONT_LABELS: Record<string, string> = {
  literata: "Literata",
  grotesk: "Space Grotesk",
  georgia: "Georgia",
  times: "Times New Roman",
  arial: "Arial",
};

export default function PrompterPage() {
  const searchParams = useSearchParams();
  const scriptId = searchParams.get("scriptId") || "";
  const sessionParam = searchParams.get("session");
  const [sessionId] = useState(() => sessionParam || nanoid(8));
  const [scriptTitle, setScriptTitle] = useState("Loading...");
  const [scriptContent, setScriptContent] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(40);
  const [fontSize, setFontSize] = useState(48);
  const [mirror, setMirror] = useState(false);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [alignOffset, setAlignOffset] = useState(0);
  const [fontFamily, setFontFamily] = useState("literata");
  const [textColor, setTextColor] = useState("#ffffff");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showControls, setShowControls] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Waiting for remote...");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  const fontSizeRef = useRef(fontSize);
  const mirrorRef = useRef(mirror);
  const alignRef = useRef(align);
  const alignOffsetRef = useRef(alignOffset);
  const fontFamilyRef = useRef(fontFamily);
  const textColorRef = useRef(textColor);

  useEffect(() => {
    const load = async () => {
      if (scriptId) {
        const script = await getScript(scriptId);
        if (script) {
          setScriptTitle(script.title);
          setScriptContent(script.content);
        }
      }
      const settings = await getSettings();
      setSpeed(settings.defaultSpeed);
      setFontSize(settings.defaultFontSize);
      setMirror(settings.mirrorDefault);
      setAlign(settings.alignDefault || "center");
      setAlignOffset(settings.alignOffsetDefault ?? 0);
      setFontFamily(settings.fontFamilyDefault || "literata");
      setTextColor(settings.textColorDefault || "#ffffff");
      setTheme(settings.theme);
    };
    load();
  }, [scriptId]);

  useEffect(() => {
    saveSettings({
      defaultSpeed: speed,
      defaultFontSize: fontSize,
      mirrorDefault: mirror,
      alignDefault: align,
      alignOffsetDefault: alignOffset,
      fontFamilyDefault: fontFamily,
      textColorDefault: textColor,
      theme,
    });
  }, [speed, fontSize, mirror, align, alignOffset, fontFamily, textColor, theme]);

  const [remoteUrl, setRemoteUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const init = async () => {
      const port =
        window.location.port ||
        (window.location.protocol === "https:" ? "443" : "80");
      let host = window.location.hostname;
      try {
        const res = await fetch("/api/host-ip");
        if (res.ok) {
          const data = (await res.json()) as { ip?: string };
          if (data?.ip) host = data.ip;
        }
      } catch {
        // Fallback to current host.
      }
      const url = `http://${host}:${port}/remote?session=${sessionId}`;
      if (cancelled) return;
      setRemoteUrl(url);
      QRCode.toDataURL(url, { margin: 1, width: 220 }).then((qr) => {
        if (!cancelled) setQrData(qr);
      });
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    mirrorRef.current = mirror;
  }, [mirror]);

  useEffect(() => {
    alignRef.current = align;
  }, [align]);

  useEffect(() => {
    alignOffsetRef.current = alignOffset;
  }, [alignOffset]);

  useEffect(() => {
    fontFamilyRef.current = fontFamily;
  }, [fontFamily]);

  useEffect(() => {
    textColorRef.current = textColor;
  }, [textColor]);

  useEffect(() => {
    const socket = joinSession({ sessionId, role: "prompter" });

    socket.on("command", (command: Command) => {
      if (command.type === "PLAY") setIsPlaying(true);
      if (command.type === "PAUSE") setIsPlaying(false);
      if (command.type === "TOGGLE_PLAY") setIsPlaying((prev) => !prev);
      if (command.type === "SET_SPEED") setSpeed(command.value);
      if (command.type === "INC_SPEED")
        setSpeed((prev) => Math.min(200, prev + command.step));
      if (command.type === "DEC_SPEED")
        setSpeed((prev) => Math.max(5, prev - command.step));
      if (command.type === "SET_FONT_SIZE") setFontSize(command.value);
      if (command.type === "INC_FONT")
        setFontSize((prev) => Math.min(120, prev + command.step));
      if (command.type === "DEC_FONT")
        setFontSize((prev) => Math.max(18, prev - command.step));
      if (command.type === "TOGGLE_MIRROR") setMirror((prev) => !prev);
      if (command.type === "SET_FONT_FAMILY") setFontFamily(command.value);
      if (command.type === "SET_TEXT_COLOR") setTextColor(command.value);
      if (command.type === "SET_ALIGN") setAlign(command.value);
      if (command.type === "NUDGE_ALIGN") {
        setAlignOffset((prev) =>
          Math.max(-240, Math.min(240, prev + command.deltaPx))
        );
      }
      if (command.type === "NUDGE_SCROLL") {
        const container = containerRef.current;
        if (!container) return;
        setIsPlaying(false);
        container.scrollTop = Math.max(0, container.scrollTop + command.deltaPx);
        scrollRef.current = container.scrollTop;
      }
      if (command.type === "RESET_SCROLL") {
        const container = containerRef.current;
        if (!container) return;
        setIsPlaying(false);
        container.scrollTop = 0;
        scrollRef.current = 0;
      }

      if (command.type === "PLAY") setToast("Play");
      if (command.type === "PAUSE") setToast("Pause");
      if (command.type === "TOGGLE_PLAY")
        setToast(isPlayingRef.current ? "Pause" : "Play");
      if (
        command.type === "SET_SPEED" ||
        command.type === "INC_SPEED" ||
        command.type === "DEC_SPEED"
      ) {
        const nextSpeed =
          command.type === "SET_SPEED"
            ? command.value
            : Math.max(
                5,
                Math.min(
                  200,
                  speedRef.current +
                    (command.type === "INC_SPEED" ? command.step : -command.step)
                )
              );
        setToast(`Speed ${Math.round(nextSpeed)} px/s`);
      }
      if (
        command.type === "SET_FONT_SIZE" ||
        command.type === "INC_FONT" ||
        command.type === "DEC_FONT"
      ) {
        const nextFont =
          command.type === "SET_FONT_SIZE"
            ? command.value
            : Math.max(
                18,
                Math.min(
                  120,
                  fontSizeRef.current +
                    (command.type === "INC_FONT" ? command.step : -command.step)
                )
              );
        setToast(`Font ${Math.round(nextFont)}px`);
      }
      if (command.type === "TOGGLE_MIRROR")
        setToast(`Mirror ${mirrorRef.current ? "Off" : "On"}`);
      if (command.type === "SET_FONT_FAMILY")
        setToast(`Font ${FONT_LABELS[command.value] || command.value}`);
      if (command.type === "SET_TEXT_COLOR") setToast("Color updated");
      if (command.type === "SET_ALIGN")
        setToast(`Align ${command.value}`);
      if (command.type === "NUDGE_ALIGN")
        setToast(`Offset ${alignOffsetRef.current + command.deltaPx}px`);
      if (command.type === "RESET_SCROLL") setToast("Back to top");
      if (command.type === "NUDGE_SCROLL")
        setToast(command.deltaPx < 0 ? "Nudge up" : "Nudge down");
    });

    socket.on("session:status", (status) => {
      setRemoteConnected(status.connectedRemote);
      setStatusText(
        status.connectedRemote ? "Remote connected" : "Waiting for remote..."
      );
    });

    return () => {
      socket.off("command");
      socket.off("session:status");
    };
  }, [sessionId]);

  useEffect(() => {
    const socket = getSocket();
    const sendState = () => {
      const state: PrompterState = {
        sessionId,
        isPlaying,
        speed,
        fontSize,
        mirror,
        align,
        alignOffset,
        fontFamily,
        textColor,
        scriptTitle,
        scrollPosition: scrollRef.current,
      };
      socket.emit("state:update", state);
    };
    const interval = window.setInterval(sendState, 150);
    return () => window.clearInterval(interval);
  }, [
    sessionId,
    isPlaying,
    speed,
    fontSize,
    mirror,
    align,
    alignOffset,
    fontFamily,
    textColor,
    scriptTitle,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
        setToast(isPlayingRef.current ? "Pause" : "Play");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const step = (time: number) => {
      const container = containerRef.current;
      if (!container) return;
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      if (isPlaying) {
        const next = container.scrollTop + speed * delta;
        container.scrollTop = next;
        scrollRef.current = next;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTimeRef.current = null;
    };
  }, [isPlaying, speed]);

  useEffect(() => {
    if (!showControls) return;
    const timeout = window.setTimeout(() => setShowControls(false), 3500);
    return () => window.clearTimeout(timeout);
  }, [showControls]);

  const toggleControls = () => setShowControls((prev) => !prev);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    scrollRef.current = container.scrollTop;
  };

  const handleFullscreen = () => {
    const target = document.documentElement;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 1200);
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [toast]);

  return (
    <main
      className={`min-h-screen ${
        theme === "dark" ? "bg-black" : "bg-[#f5f1e9]"
      }`}
      onClick={toggleControls}
    >
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative h-screen overflow-y-auto px-10 py-16"
      >
        <div
          className={`pointer-events-none sticky top-[40%] z-20 flex justify-center overflow-hidden transition-all duration-300 ${
            toast ? "h-20 opacity-100" : "h-0 opacity-0"
          }`}
        >
          <div
            className="px-6 py-2 text-4xl font-semibold text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]"
            style={{ fontFamily: "var(--font-literata)" }}
          >
            {toast}
          </div>
        </div>
        <article
          className="mx-auto max-w-4xl whitespace-pre-wrap leading-[1.6]"
          style={{
            fontSize: `${fontSize}px`,
            fontFamily: FONT_FAMILIES[fontFamily] || FONT_FAMILIES.literata,
            color: textColor,
            textAlign: align,
            transform: mirror
              ? `scaleX(-1) translateX(${alignOffset}px)`
              : `translateX(${alignOffset}px)`,
          }}
        >
          {scriptContent || "No script content yet."}
        </article>
      </div>

      {showControls && (
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6">
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-black/50 px-5 py-3 text-sm text-white backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                Prompter Session
              </p>
              <p className="text-base font-semibold">{scriptTitle}</p>
              <p className="text-xs text-white/60">{statusText}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-full border border-white/30 px-3 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  setTheme((prev) => (prev === "dark" ? "light" : "dark"));
                  setToast(theme === "dark" ? "High contrast" : "Dim stage");
                }}
              >
                {theme === "dark" ? "High Contrast" : "Dim Stage"}
              </button>
              <button
                className="rounded-full border border-white/30 px-3 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  setMirror((prev) => !prev);
                  setToast(mirror ? "Mirror off" : "Mirror on");
                }}
              >
                {mirror ? "Mirror On" : "Mirror Off"}
              </button>
              <button
                className="rounded-full border border-white/30 px-3 py-1"
                onClick={(event) => {
                  event.stopPropagation();
                  handleFullscreen();
                }}
              >
                Fullscreen
              </button>
            </div>
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4">
            <div className="rounded-3xl bg-black/60 px-5 py-4 text-white backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                Remote Control
              </p>
              <p className="mt-1 text-sm">{remoteUrl}</p>
              <div className="mt-3 flex items-center gap-3">
                {qrData && (
                  <img
                    src={qrData}
                    alt="Remote QR code"
                    className="h-24 w-24 rounded-2xl border border-white/20 bg-white p-1"
                  />
                )}
                <div className="text-xs text-white/70">
                  {remoteConnected
                    ? "Remote connected."
                    : "Scan to connect a remote controller."}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-black/60 px-5 py-4 text-white backdrop-blur">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsPlaying((prev) => !prev);
                    setToast(isPlaying ? "Pause" : "Play");
                  }}
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <div className="text-xs text-white/70">
                  Speed {Math.round(speed)} px/s · Font {fontSize}px
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="rounded-full border border-white/30 px-3 py-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSpeed((prev) => Math.max(5, prev - SPEED_STEP));
                    setToast(`Speed ${Math.max(5, speed - SPEED_STEP)} px/s`);
                  }}
                >
                  Speed -
                </button>
                <button
                  className="rounded-full border border-white/30 px-3 py-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSpeed((prev) => Math.min(200, prev + SPEED_STEP));
                    setToast(`Speed ${Math.min(200, speed + SPEED_STEP)} px/s`);
                  }}
                >
                  Speed +
                </button>
                <button
                  className="rounded-full border border-white/30 px-3 py-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFontSize((prev) => Math.max(18, prev - FONT_STEP));
                    setToast(`Font ${Math.max(18, fontSize - FONT_STEP)}px`);
                  }}
                >
                  Font -
                </button>
                <button
                  className="rounded-full border border-white/30 px-3 py-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFontSize((prev) => Math.min(120, prev + FONT_STEP));
                    setToast(`Font ${Math.min(120, fontSize + FONT_STEP)}px`);
                  }}
                >
                  Font +
                </button>
                <button
                  className="rounded-full border border-white/30 px-3 py-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    const container = containerRef.current;
                    if (!container) return;
                    setIsPlaying(false);
                    container.scrollTop = 0;
                    scrollRef.current = 0;
                    setToast("Back to top");
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
