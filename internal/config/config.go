package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type Settings struct {
	NetworkThresholdKbps        float64       `json:"networkThresholdKbps"`
	DiskThresholdMBps           float64       `json:"diskThresholdMBps"`
	IdleDuration                time.Duration `json:"idleDuration"`
	CountdownDuration           time.Duration `json:"countdownDuration"`
	Action                      string        `json:"action"`
	SampleIntervalSeconds       int           `json:"sampleIntervalSeconds"`
	PauseWhenTrackedAppsRunning bool          `json:"pauseWhenTrackedAppsRunning"`
	TrackedApps                 []string      `json:"trackedApps"`
}

func DefaultSettings() Settings {
	return Settings{
		NetworkThresholdKbps:        50,
		DiskThresholdMBps:           1,
		IdleDuration:                5 * time.Minute,
		CountdownDuration:           60 * time.Second,
		Action:                      "shutdown",
		SampleIntervalSeconds:       1,
		PauseWhenTrackedAppsRunning: true,
		TrackedApps: []string{
			"steam.exe",
			"epicgameslauncher.exe",
			"upc.exe",
			"ubisoftconnect.exe",
			"xboxappservices.exe",
			"gamingservices.exe",
		},
	}
}

func normalizeSettings(s Settings) Settings {
	d := DefaultSettings()

	if s.NetworkThresholdKbps <= 0 {
		s.NetworkThresholdKbps = d.NetworkThresholdKbps
	}
	if s.DiskThresholdMBps <= 0 {
		s.DiskThresholdMBps = d.DiskThresholdMBps
	}
	if s.IdleDuration <= 0 {
		s.IdleDuration = d.IdleDuration
	}
	if s.CountdownDuration <= 0 {
		s.CountdownDuration = d.CountdownDuration
	}
	if s.Action == "" {
		s.Action = d.Action
	}
	if s.SampleIntervalSeconds <= 0 {
		s.SampleIntervalSeconds = d.SampleIntervalSeconds
	}
	if len(s.TrackedApps) == 0 {
		s.TrackedApps = d.TrackedApps
	}

	return s
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
	return normalizeSettings(s), nil
}

func Save(s Settings) error {
	s = normalizeSettings(s)

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
