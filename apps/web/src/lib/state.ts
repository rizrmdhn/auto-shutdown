export const STATE_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  IDLE_CANDIDATE: "Watching",
  CONFIRMED_IDLE: "Idle",
  COUNTDOWN: "Countdown",
  SHUTDOWN: "Shutdown",
};

export const STATE_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  IDLE_CANDIDATE: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  CONFIRMED_IDLE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  COUNTDOWN: "bg-destructive/15 text-destructive",
  SHUTDOWN: "bg-destructive/20 text-destructive",
};
