import { create } from "zustand";

export type MonitorState =
  | "ACTIVE"
  | "IDLE_CANDIDATE"
  | "CONFIRMED_IDLE"
  | "COUNTDOWN"
  | "SHUTDOWN";

export type SpeedPoint = {
  time: number;
  networkBytesPerSecond: number;
  diskBytesPerSecond: number;
};

interface MonitorStore {
  isRunning: boolean;
  state: MonitorState;
  networkKbps: number;
  diskMBps: number;
  countdown: number;
  history: SpeedPoint[];
  setRunning: (running: boolean) => void;
  setState: (s: MonitorState) => void;
  setMetrics: (net: number, disk: number) => void;
  setCountdown: (n: number) => void;
  appendHistory: (point: SpeedPoint, maxPoints: number) => void;
  clearHistory: () => void;
}

export const useMonitorStore = create<MonitorStore>((set) => ({
  isRunning: false,
  state: "ACTIVE",
  networkKbps: 0,
  diskMBps: 0,
  countdown: 0,
  history: [],
  setRunning: (isRunning) => set({ isRunning }),
  setState: (state) => set({ state }),
  setMetrics: (networkKbps, diskMBps) => set({ networkKbps, diskMBps }),
  setCountdown: (countdown) => set({ countdown }),
  appendHistory: (point, maxPoints) =>
    set((current) => {
      const next = [...current.history, point];
      return {
        history:
          next.length > maxPoints ? next.slice(next.length - maxPoints) : next,
      };
    }),
  clearHistory: () => set({ history: [] }),
}));
