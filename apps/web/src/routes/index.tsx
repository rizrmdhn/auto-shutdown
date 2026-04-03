import { useEffect, useMemo, useState } from "react";

import { DownloaderProfileSelect } from "@/components/downloader-profile-select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { STATE_COLOR, STATE_LABEL } from "@/lib/state";
import {
  globalErrorToast,
  globalInfoToast,
  globalSuccessToast,
} from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  cancelShutdown,
  getMetrics,
  getSettings,
  getStatus,
  saveSettings,
  startMonitor,
  stopMonitor,
  type DownloaderType as DownloaderTypeValue,
} from "@/lib/wails";
import { useMonitorStore } from "@/store/monitor";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [trackedAppRunning, setTrackedAppRunning] = useState(false);
  const [downloaderType, setDownloaderType] =
    useState<DownloaderTypeValue>("AUTO");
  const [useBitsPerSecond, setUseBitsPerSecond] = useState(false);
  const [trackDiskUsage, setTrackDiskUsage] = useState(true);

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
    let mounted = true;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (!mounted) {
          return;
        }
        setDownloaderType(settings.downloaderType);
        setUseBitsPerSecond(settings.useBitsPerSecond);
        setTrackDiskUsage(settings.trackDiskUsage);
      } catch {
        globalErrorToast("Failed to load downloader profile");
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleDownloaderTypeChange = async (nextType: DownloaderTypeValue) => {
    setDownloaderType(nextType);
    try {
      const settings = await getSettings();
      await saveSettings({
        ...settings,
        downloaderType: nextType,
      });
      setUseBitsPerSecond(settings.useBitsPerSecond);
      globalSuccessToast("Downloader profile updated");
    } catch {
      globalErrorToast("Failed to update downloader profile");
    }
  };

  const handleUseBitsToggle = async (checked: boolean | "indeterminate") => {
    const useBits = checked === true;
    setUseBitsPerSecond(useBits);

    try {
      const settings = await getSettings();
      await saveSettings({
        ...settings,
        useBitsPerSecond: useBits,
      });
      globalSuccessToast(`Speed unit set to ${useBits ? "bits/s" : "bytes/s"}`);
    } catch {
      globalErrorToast("Failed to update speed unit");
    }
  };

  const handleTrackDiskUsageToggle = async (
    checked: boolean | "indeterminate",
  ) => {
    const trackDisk = checked === true;
    setTrackDiskUsage(trackDisk);

    try {
      const settings = await getSettings();
      await saveSettings({
        ...settings,
        trackDiskUsage: trackDisk,
      });
      globalSuccessToast(
        trackDisk
          ? "Disk usage tracking enabled"
          : "Disk usage tracking disabled",
      );
    } catch {
      globalErrorToast("Failed to update disk tracking setting");
    }
  };

  const formatSpeed = (bytesPerSecond: number) => {
    const base = useBitsPerSecond ? 1000 : 1024;
    const units = useBitsPerSecond
      ? ["b/s", "Kb/s", "Mb/s", "Gb/s", "Tb/s"]
      : ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];

    let value = useBitsPerSecond ? bytesPerSecond * 8 : bytesPerSecond;
    let unitIndex = 0;

    for (; unitIndex < units.length - 1 && value >= base; unitIndex++) {
      value /= base;
    }

    const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(decimals)} ${units[unitIndex]}`;
  };

  const networkDisplay = formatSpeed(networkKbps * 1024);
  const diskDisplay = formatSpeed(diskMBps * 1024 * 1024);

  const statusVariant = useMemo(() => {
    if (!isRunning) {
      return "secondary" as const;
    }
    if (state === "COUNTDOWN") {
      return "destructive" as const;
    }
    return "default" as const;
  }, [isRunning, state]);

  const trackedLauncherLabel = useMemo(() => {
    if (downloaderType === "AUTO") {
      return trackedAppRunning
        ? "Auto mode: launcher pattern detected"
        : "Auto mode: waiting for launcher pattern";
    }

    return trackedAppRunning
      ? "Tracked launcher active"
      : "No tracked launcher active";
  }, [downloaderType, trackedAppRunning]);

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
          <Badge variant={statusVariant} className={cn(STATE_COLOR[state])}>
            {isRunning ? STATE_LABEL[state] : "STOPPED"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
            <DownloaderProfileSelect
              value={downloaderType}
              onValueChange={handleDownloaderTypeChange}
              triggerClassName="w-44"
            />
            <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
              <Checkbox
                checked={useBitsPerSecond}
                onCheckedChange={handleUseBitsToggle}
                aria-label="Display speed in bits per second"
              />
              <Label>bits/s</Label>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
              <Checkbox
                checked={trackDiskUsage}
                onCheckedChange={handleTrackDiskUsageToggle}
                aria-label="Track disk usage for idle detection"
              />
              <Label>track disk</Label>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Network Activity</CardDescription>
                <CardTitle>{networkDisplay}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>
                  {trackDiskUsage ? "Disk Activity" : "Disk Activity (Ignored)"}
                </CardDescription>
                <CardTitle>{diskDisplay}</CardTitle>
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
              {trackedLauncherLabel}
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
