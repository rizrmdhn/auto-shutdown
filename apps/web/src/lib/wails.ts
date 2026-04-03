// Shim agar bisa develop di browser tanpa Wails runtime
// Di dalam Wails, window.go akan tersedia secara otomatis

export interface AppSettings {
  networkThresholdKbps: number;
  diskThresholdMBps: number;
  idleDurationSeconds: number;
  countdownDurationSeconds: number;
  action: "shutdown" | "sleep" | "hibernate";
  sampleIntervalSeconds: number;
  pauseWhenTrackedAppsRunning: boolean;
  trackedApps: string[];
}

export interface AppStatus {
  running: boolean;
  state:
    | "ACTIVE"
    | "IDLE_CANDIDATE"
    | "CONFIRMED_IDLE"
    | "COUNTDOWN"
    | "SHUTDOWN";
  countdownSeconds: number;
  trackedAppRunning: boolean;
}

const mockSettings: AppSettings = {
  networkThresholdKbps: 50,
  diskThresholdMBps: 1,
  idleDurationSeconds: 300,
  countdownDurationSeconds: 60,
  action: "shutdown",
  sampleIntervalSeconds: 1,
  pauseWhenTrackedAppsRunning: true,
  trackedApps: [
    "steam.exe",
    "epicgameslauncher.exe",
    "upc.exe",
    "ubisoftconnect.exe",
    "xboxappservices.exe",
    "gamingservices.exe",
  ],
};

declare global {
  interface Window {
    go?: {
      main: {
        App: {
          StartMonitor: () => Promise<void>;
          StopMonitor: () => Promise<void>;
          CancelShutdown: () => Promise<void>;
          GetMetrics: () => Promise<Record<string, number>>;
          GetSettings: () => Promise<AppSettings>;
          SaveSettings: (settings: AppSettings) => Promise<void>;
          GetStatus: () => Promise<AppStatus>;
        };
      };
    };
  }
}

export async function startMonitor(): Promise<void> {
  if (window.go) return window.go.main.App.StartMonitor();
  console.warn("[dev] Wails not available — using mock");
}

export async function stopMonitor(): Promise<void> {
  if (window.go) return window.go.main.App.StopMonitor();
}

export async function cancelShutdown(): Promise<void> {
  if (window.go) return window.go.main.App.CancelShutdown();
}

export async function getMetrics(): Promise<Record<string, number>> {
  if (window.go) return window.go.main.App.GetMetrics();
  return { networkKbps: 0, diskMBps: 0 };
}

export async function getSettings(): Promise<AppSettings> {
  if (window.go) return window.go.main.App.GetSettings();
  return mockSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (window.go) return window.go.main.App.SaveSettings(settings);
}

export async function getStatus(): Promise<AppStatus> {
  if (window.go) return window.go.main.App.GetStatus();
  return {
    running: false,
    state: "ACTIVE",
    countdownSeconds: 0,
    trackedAppRunning: false,
  };
}
