import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
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
