import { Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <div className="overflow-y-auto p-4">
        <Outlet />
      </div>
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  );
}
