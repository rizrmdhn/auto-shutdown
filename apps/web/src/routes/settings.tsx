import { useEffect, useState } from "react";

import { DownloaderProfileSelect } from "@/components/downloader-profile-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { globalErrorToast, globalSuccessToast } from "@/lib/toast";
import {
  DownloaderType,
  autoFallbackPatterns,
  getSettings,
  processNamesByDownloader,
  saveSettings,
  type AppSettings,
  type DownloaderType as DownloaderTypeValue,
} from "@/lib/wails";
import { IconArrowLeft } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [trackedAppsInput, setTrackedAppsInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        const data = await getSettings();
        if (!mounted) {
          return;
        }
        setSettings(data);
        setTrackedAppsInput((data.trackedApps ?? []).join("\n"));
      } catch {
        globalErrorToast("Failed to load settings");
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveSettings = async () => {
    if (!settings) {
      return;
    }

    const trackedApps = trackedAppsInput
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const nextSettings: AppSettings = {
      ...settings,
      trackedApps,
    };

    setIsSaving(true);
    try {
      await saveSettings(nextSettings);
      setSettings(nextSettings);
      globalSuccessToast("Settings saved");
    } catch {
      globalErrorToast("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const applyRecommendedProcesses = (downloaderType: DownloaderTypeValue) => {
    if (downloaderType === DownloaderType.AUTO) {
      setTrackedAppsInput("");
      return;
    }
    setTrackedAppsInput(processNamesByDownloader[downloaderType].join("\n"));
  };

  if (!settings) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading monitor settings...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex items-center">
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          <IconArrowLeft data-icon="inline-start" />
          Back to Monitor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monitoring Settings</CardTitle>
          <CardDescription>
            Configure thresholds, countdown behavior, and game launcher process
            names.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="networkThresholdKbps">
                Network threshold (KB/s)
              </FieldLabel>
              <Input
                id="networkThresholdKbps"
                type="number"
                min={1}
                value={settings.networkThresholdKbps}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          networkThresholdKbps: Number(event.target.value) || 1,
                        }
                      : prev,
                  )
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="diskThresholdMBps">
                Disk threshold (MB/s)
              </FieldLabel>
              <Input
                id="diskThresholdMBps"
                type="number"
                min={0.1}
                step={0.1}
                value={settings.diskThresholdMBps}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          diskThresholdMBps: Number(event.target.value) || 0.1,
                        }
                      : prev,
                  )
                }
              />
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={settings.trackDiskUsage}
                onCheckedChange={(checked) =>
                  setSettings((prev) =>
                    prev ? { ...prev, trackDiskUsage: checked } : prev,
                  )
                }
              />
              <div className="flex flex-col gap-0.5">
                <FieldLabel>Track disk usage</FieldLabel>
                <FieldDescription>
                  Include disk activity in idle detection. Disable this to use
                  network activity only.
                </FieldDescription>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="idleDurationSeconds">
                Idle duration (seconds)
              </FieldLabel>
              <Input
                id="idleDurationSeconds"
                type="number"
                min={10}
                value={settings.idleDurationSeconds}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          idleDurationSeconds: Number(event.target.value) || 10,
                        }
                      : prev,
                  )
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="countdownDurationSeconds">
                Countdown duration (seconds)
              </FieldLabel>
              <Input
                id="countdownDurationSeconds"
                type="number"
                min={5}
                value={settings.countdownDurationSeconds}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          countdownDurationSeconds:
                            Number(event.target.value) || 5,
                        }
                      : prev,
                  )
                }
              />
            </Field>

            <Field>
              <FieldLabel>Downloader profile</FieldLabel>
              <DownloaderProfileSelect
                value={settings.downloaderType}
                onValueChange={(nextType) => {
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          downloaderType: nextType,
                        }
                      : prev,
                  );
                  applyRecommendedProcesses(nextType);
                }}
              />
              <FieldDescription>
                Auto mode uses pattern matching:{" "}
                {autoFallbackPatterns.join(", ")}.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="sampleIntervalSeconds">
                Sample interval (seconds)
              </FieldLabel>
              <Input
                id="sampleIntervalSeconds"
                type="number"
                min={1}
                value={settings.sampleIntervalSeconds}
                onChange={(event) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          sampleIntervalSeconds:
                            Number(event.target.value) || 1,
                        }
                      : prev,
                  )
                }
              />
            </Field>

            <Field>
              <FieldLabel>Power action</FieldLabel>
              <Select
                value={settings.action}
                onValueChange={(value) =>
                  setSettings((prev) =>
                    prev
                      ? {
                          ...prev,
                          action: value as AppSettings["action"],
                        }
                      : prev,
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="shutdown">Shutdown</SelectItem>
                    <SelectItem value="sleep">Sleep</SelectItem>
                    <SelectItem value="hibernate">Hibernate</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={settings.pauseWhenTrackedAppsRunning}
                onCheckedChange={(checked) =>
                  setSettings((prev) =>
                    prev
                      ? { ...prev, pauseWhenTrackedAppsRunning: checked }
                      : prev,
                  )
                }
              />
              <div className="flex flex-col gap-0.5">
                <FieldLabel>
                  Pause when tracked launchers are running
                </FieldLabel>
                <FieldDescription>
                  Keeps monitor in active mode while processes like Steam, Epic,
                  Ubisoft Connect, or Xbox services are detected.
                </FieldDescription>
              </div>
            </Field>

            <Field orientation="horizontal">
              <Switch
                checked={settings.useBitsPerSecond}
                onCheckedChange={(checked) =>
                  setSettings((prev) =>
                    prev ? { ...prev, useBitsPerSecond: checked } : prev,
                  )
                }
              />
              <div className="flex flex-col gap-0.5">
                <FieldLabel>Display speed in bits/s</FieldLabel>
                <FieldDescription>
                  Toggle between byte-based units (KB/s, MB/s) and bit-based
                  units (Kb/s, Mb/s), similar to Steam.
                </FieldDescription>
              </div>
            </Field>

            <Field>
              <FieldLabel htmlFor="trackedApps">
                Tracked process names
              </FieldLabel>
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    applyRecommendedProcesses(settings.downloaderType)
                  }
                >
                  Use Recommended List
                </Button>
              </div>
              <Textarea
                id="trackedApps"
                value={trackedAppsInput}
                onChange={(event) => setTrackedAppsInput(event.target.value)}
              />
              <FieldDescription>
                One process filename per line, for example: steam.exe,
                epicgameslauncher.exe, ubisoftconnect.exe.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
