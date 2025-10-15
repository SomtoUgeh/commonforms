import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_BACKEND_URL, POLL_INTERVAL_MS } from "@/constants/api";

type SettingsState = {
  backendUrl: string;
  pollInterval: number;
  setBackendUrl: (url: string) => void;
  setPollInterval: (interval: number) => void;
  reset: () => void;
};

export const DEFAULT_SETTINGS = {
  backendUrl: DEFAULT_BACKEND_URL,
  pollInterval: POLL_INTERVAL_MS,
};

/**
 * Settings store with localStorage persistence
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setBackendUrl: (url) => set({ backendUrl: url }),
      setPollInterval: (interval) => set({ pollInterval: interval }),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "commonforms-settings",
    }
  )
);
