import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATE_COLOR, STATE_LABEL } from "@/lib/state";
import { cn } from "@/lib/utils";
import { useMonitorStore } from "@/store/monitor";
import {
  IconMoon,
  IconPower,
  IconSettings,
  IconSun,
} from "@tabler/icons-react";
import { useLocation, useNavigate } from "@tanstack/react-router";

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
