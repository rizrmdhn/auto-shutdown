// Shim agar bisa develop di browser tanpa Wails runtime
// Di dalam Wails, window.go akan tersedia secara otomatis

export const DownloaderType = {
  AUTO: "AUTO",
  STEAM: "STEAM",
  XBOX: "XBOX",
  EPIC: "EPIC",
  BATTLE_NET: "BATTLE_NET",
  EA_APP: "EA_APP",
  UBISOFT_CONNECT: "UBISOFT_CONNECT",
} as const;

export type DownloaderType =
  (typeof DownloaderType)[keyof typeof DownloaderType];

export const processNamesByDownloader: Record<DownloaderType, string[]> = {
  [DownloaderType.AUTO]: [],
  [DownloaderType.STEAM]: [
    "steam.exe",
    "steamservice.exe",
    "steamwebhelper.exe",
  ],
  [DownloaderType.XBOX]: [
    "gamingservices.exe",
    "gamingservicesnet.exe",
    "xboxpcapp.exe",
    "xboxappservices.exe",
    "xboxgamebar.exe",
  ],
  [DownloaderType.EPIC]: [
    "epicgameslauncher.exe",
    "epiconlineservicesuserhelper.exe",
  ],
  [DownloaderType.BATTLE_NET]: [
    "battle.net.exe",
    "agent.exe",
    "blizzard update agent.exe",
  ],
  [DownloaderType.EA_APP]: [
    "eadesktop.exe",
    "eabackgroundservice.exe",
    "origin.exe",
  ],
  [DownloaderType.UBISOFT_CONNECT]: ["upc.exe", "ubisoftconnect.exe"],
};

export const autoFallbackPatterns = [
  "steam",
  "gamingservices",
  "xbox",
  "epic",
  "battle.net",
  "blizzard",
  "agent",
  "ea",
  "origin",
  "ubisoft",
  "uplay",
];

export interface AppSettings {
  networkThresholdKbps: number;
  diskThresholdMBps: number;
  trackDiskUsage: boolean;
  idleDurationSeconds: number;
  countdownDurationSeconds: number;
  action: "shutdown" | "sleep" | "hibernate";
  downloaderType: DownloaderType;
  useBitsPerSecond: boolean;
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
  trackDiskUsage: true,
  idleDurationSeconds: 20,
  countdownDurationSeconds: 10,
  action: "shutdown",
  downloaderType: DownloaderType.AUTO,
  useBitsPerSecond: false,
  sampleIntervalSeconds: 1,
  pauseWhenTrackedAppsRunning: false,
  trackedApps: [],
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
  if (window.go) {
    const settings = await window.go.main.App.GetSettings();
    return {
      ...settings,
      downloaderType: settings.downloaderType ?? DownloaderType.AUTO,
      trackDiskUsage: settings.trackDiskUsage ?? true,
      useBitsPerSecond: settings.useBitsPerSecond ?? false,
      trackedApps: settings.trackedApps ?? [],
    };
  }
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
