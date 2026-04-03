import { create } from "zustand";

export type MonitorState =
  | "ACTIVE"
  | "IDLE_CANDIDATE"
  | "CONFIRMED_IDLE"
  | "COUNTDOWN"
  | "SHUTDOWN";

interface MonitorStore {
  isRunning: boolean;
  state: MonitorState;
  networkKbps: number;
  diskMBps: number;
  countdown: number;
  setRunning: (running: boolean) => void;
  setState: (s: MonitorState) => void;
  setMetrics: (net: number, disk: number) => void;
  setCountdown: (n: number) => void;
}

export const useMonitorStore = create<MonitorStore>((set) => ({
  isRunning: false,
  state: "ACTIVE",
  networkKbps: 0,
  diskMBps: 0,
  countdown: 0,
  setRunning: (isRunning) => set({ isRunning }),
  setState: (state) => set({ state }),
  setMetrics: (networkKbps, diskMBps) => set({ networkKbps, diskMBps }),
  setCountdown: (countdown) => set({ countdown }),
}));
