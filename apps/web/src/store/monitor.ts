import { create } from 'zustand'

export type MonitorState = 'ACTIVE' | 'IDLE_CANDIDATE' | 'CONFIRMED_IDLE' | 'COUNTDOWN' | 'SHUTDOWN'

interface MonitorStore {
  state: MonitorState
  networkKbps: number
  diskMBps: number
  countdown: number
  setState: (s: MonitorState) => void
  setMetrics: (net: number, disk: number) => void
  setCountdown: (n: number) => void
}

export const useMonitorStore = create<MonitorStore>((set) => ({
  state: 'ACTIVE',
  networkKbps: 0,
  diskMBps: 0,
  countdown: 0,
  setState: (state) => set({ state }),
  setMetrics: (networkKbps, diskMBps) => set({ networkKbps, diskMBps }),
  setCountdown: (countdown) => set({ countdown }),
}))
