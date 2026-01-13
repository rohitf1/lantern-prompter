export type Script = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

export type Settings = {
  defaultSpeed: number;
  defaultFontSize: number;
  theme: "dark" | "light";
  mirrorDefault: boolean;
  alignDefault?: "left" | "center" | "right";
  alignOffsetDefault?: number;
  fontFamilyDefault?: string;
  textColorDefault?: string;
};

export type Role = "prompter" | "remote";

export type JoinPayload = {
  sessionId: string;
  role: Role;
  pin?: string;
};

export type Command =
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_SPEED"; value: number }
  | { type: "INC_SPEED"; step: number }
  | { type: "DEC_SPEED"; step: number }
  | { type: "SET_FONT_SIZE"; value: number }
  | { type: "INC_FONT"; step: number }
  | { type: "DEC_FONT"; step: number }
  | { type: "TOGGLE_MIRROR" }
  | { type: "SET_FONT_FAMILY"; value: string }
  | { type: "SET_TEXT_COLOR"; value: string }
  | { type: "SET_ALIGN"; value: "left" | "center" | "right" }
  | { type: "NUDGE_ALIGN"; deltaPx: number }
  | { type: "NUDGE_SCROLL"; deltaPx: number }
  | { type: "RESET_SCROLL" }
  | { type: "LOAD_SCRIPT"; scriptId: string };

export type PrompterState = {
  sessionId: string;
  isPlaying: boolean;
  speed: number;
  fontSize: number;
  mirror: boolean;
  align: "left" | "center" | "right";
  alignOffset: number;
  fontFamily: string;
  textColor: string;
  scriptTitle: string;
  scrollPosition: number;
};

export type SessionStatus = {
  connectedPrompter: boolean;
  connectedRemote: boolean;
  message?: string;
};
