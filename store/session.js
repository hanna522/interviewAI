// store/session.js
import { create } from "zustand";

export const useSessionStore = create((set) => ({
  transcript: [],
  captions: "", // 현재 말하고 있는 문장
  addTurn: (t) => set((s) => ({ transcript: [...s.transcript, t] })),
  addCaption: (delta) => set((s) => ({ captions: s.captions + delta })),
  commitCaption: (text) =>
    set((s) => ({
      transcript: [...s.transcript, { role: "assistant", text }],
      captions: "",
    })),
}));
