import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  globalErrorToast,
  globalInfoToast,
  globalSuccessToast,
} from "@/lib/toast";
import {
  cancelShutdown,
  getMetrics,
  getStatus,
  startMonitor,
  stopMonitor,
} from "@/lib/wails";
import { useMonitorStore } from "@/store/monitor";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [trackedAppRunning, setTrackedAppRunning] = useState(false);

  const {
    isRunning,
    state,
    countdown,
    networkKbps,
    diskMBps,
    setRunning,
    setState,
    setMetrics,
    setCountdown,
  } = useMonitorStore();

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const [metrics, status] = await Promise.all([
          getMetrics(),
          getStatus(),
        ]);
        setMetrics(metrics.networkKbps ?? 0, metrics.diskMBps ?? 0);
        setRunning(status.running);
        setState(status.state);
        setCountdown(status.countdownSeconds);
        setTrackedAppRunning(status.trackedAppRunning);
      } catch {
        setMetrics(0, 0);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [setCountdown, setMetrics, setRunning, setState]);

  const handleStart = async () => {
    try {
      await startMonitor();
      setRunning(true);
      setState("ACTIVE");
      setCountdown(0);
      globalSuccessToast("Monitoring started");
    } catch {
      globalErrorToast("Failed to start monitor");
    }
  };

  const handleStop = async () => {
    try {
      await stopMonitor();
      setRunning(false);
      setState("ACTIVE");
      setCountdown(0);
      globalInfoToast("Monitoring stopped");
    } catch {
      globalErrorToast("Failed to stop monitor");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelShutdown();
      setState("ACTIVE");
      setCountdown(0);
      globalInfoToast("Shutdown countdown canceled");
    } catch {
      globalErrorToast("Failed to cancel shutdown");
    }
  };

  const statusVariant = useMemo(() => {
    if (!isRunning) {
      return "secondary" as const;
    }
    if (state === "COUNTDOWN") {
      return "destructive" as const;
    }
    return "default" as const;
  }, [isRunning, state]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 py-6">
      <Card className="w-full">
        <CardHeader className="flex items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="flex flex-col gap-1">
            <CardTitle>Auto Shutdown Monitor</CardTitle>
            <CardDescription>
              Watch network and disk activity, then auto-run your configured
              power action when idle.
            </CardDescription>
          </div>
          <Badge variant={statusVariant}>{isRunning ? state : "STOPPED"}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleStart} disabled={isRunning}>
              Start Monitor
            </Button>
            <Button
              variant="secondary"
              onClick={handleStop}
              disabled={!isRunning}
            >
              Stop Monitor
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!isRunning}
            >
              Cancel Shutdown
            </Button>
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Network Activity</CardDescription>
                <CardTitle>{networkKbps.toFixed(2)} KB/s</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Disk Activity</CardDescription>
                <CardTitle>{diskMBps.toFixed(3)} MB/s</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Countdown</CardDescription>
                <CardTitle>{countdown}s</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={trackedAppRunning ? "default" : "outline"}>
              {trackedAppRunning
                ? "Tracked launcher active"
                : "No tracked launcher active"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Monitor Notes</CardTitle>
          <CardDescription>
            Tune thresholds in Settings for your launcher and download profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardDescription>When To Increase Thresholds</CardDescription>
              <CardTitle className="text-sm">High background traffic</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>When To Lower Thresholds</CardDescription>
              <CardTitle className="text-sm">
                Aggressive idle detection
              </CardTitle>
            </CardHeader>
          </Card>
        </CardContent>
        <CardFooter>
          <CardDescription>
            Tip: Keep launcher process names up to date in the Settings page for
            Steam, Epic, Ubisoft Connect, and Xbox services.
          </CardDescription>
        </CardFooter>
      </Card>
    </div>
  );
}
