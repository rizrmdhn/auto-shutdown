package config

import (
  "encoding/json"
  "os"
  "path/filepath"
  "time"
)

type Settings struct {
  NetworkThresholdKbps float64       `json:"networkThresholdKbps"`
  DiskThresholdMBps    float64       `json:"diskThresholdMBps"`
  IdleDuration         time.Duration `json:"idleDuration"`
  CountdownDuration    time.Duration `json:"countdownDuration"`
  Action               string        `json:"action"`
}

func DefaultSettings() Settings {
  return Settings{
    NetworkThresholdKbps: 50,
    DiskThresholdMBps:    1,
    IdleDuration:         5 * time.Minute,
    CountdownDuration:    60 * time.Second,
    Action:               "shutdown",
  }
}

func configPath() (string, error) {
  dir, err := os.UserConfigDir()
  if err != nil {
    return "", err
  }
  return filepath.Join(dir, "auto-shutdown", "config.json"), nil
}

func Load() (Settings, error) {
  path, err := configPath()
  if err != nil {
    return DefaultSettings(), err
  }
  data, err := os.ReadFile(path)
  if err != nil {
    return DefaultSettings(), nil // file belum ada → pakai default
  }
  var s Settings
  if err := json.Unmarshal(data, &s); err != nil {
    return DefaultSettings(), err
  }
  return s, nil
}

func Save(s Settings) error {
  path, err := configPath()
  if err != nil {
    return err
  }
  if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
    return err
  }
  data, err := json.MarshalIndent(s, "", "  ")
  if err != nil {
    return err
  }
  return os.WriteFile(path, data, 0644)
}
