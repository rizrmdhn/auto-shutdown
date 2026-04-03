import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMonitorStore } from "@/store/monitor";
import {
  IconMoon,
  IconPower,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useLocation, useNavigate } from "@tanstack/react-router";

const STATE_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  IDLE_CANDIDATE: "Watching",
  CONFIRMED_IDLE: "Idle",
  COUNTDOWN: "Countdown",
  SHUTDOWN: "Shutdown",
};

const STATE_COLOR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  IDLE_CANDIDATE: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  CONFIRMED_IDLE: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  COUNTDOWN: "bg-destructive/15 text-destructive",
  SHUTDOWN: "bg-destructive/20 text-destructive",
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMonitorStore((s) => s.state);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="flex h-header items-center justify-between border-b border-border px-4">
      <div className="flex items-center gap-2">
        <IconPower className="size-4 text-muted-foreground" />
        <span className="font-heading text-sm font-semibold tracking-tight">
          Auto Shutdown
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          className={cn(
            "rounded-full border-0 px-2 py-0.5 text-[0.625rem] font-medium",
            STATE_COLOR[state],
          )}
        >
          {STATE_LABEL[state]}
        </Badge>

        {location.pathname !== "/settings" && (
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/settings" })}
          >
            <IconSettings data-icon="inline-start" className="size-3.5" />
            <span className="leading-none">Settings</span>
          </Button>
        )}

        <Button onClick={toggleTheme}>
          {theme === "dark" ? (
            <IconSun data-icon="inline-start" className="size-3.5" />
          ) : (
            <IconMoon data-icon="inline-start" className="size-3.5" />
          )}
          <span className="leading-none">
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </Button>
      </div>
    </header>
  );
}
