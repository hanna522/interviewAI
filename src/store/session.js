// src/store/session.js
import { create } from "zustand";

export const useSessionStore = create((set) => ({
  transcript: [],
  captions: "",
  userCaptions: "",
  addTurn: (t) => set((s) => ({ transcript: [...s.transcript, t] })),
  addCaptionDelta: (delta) =>
    set((s) => ({ captions: s.captions + (delta || "") })),
  commitCaption: (text) =>
    set((s) => ({
      transcript: [
        ...s.transcript,
        { role: "assistant", text: text || s.captions },
      ],
      captions: "",
    })),
  resetCaption: () => set({ captions: "" }),

  addUserCaptionDelta: (delta) =>
    set((s) => ({ userCaptions: s.userCaptions + (delta || "") })),
  commitUserCaption: (text) =>
    set((s) => ({
      transcript: [
        ...s.transcript,
        { role: "user", text: text || s.userCaptions },
      ],
      userCaptions: "",
    })),
  resetUserCaption: () => set({ userCaptions: "" }),

  emotion: { speaker: null, label: "neutral", valence: 0, arousal: 0.1 },
  setEmotion: (payload) => set(() => ({ emotion: payload })),

}));

