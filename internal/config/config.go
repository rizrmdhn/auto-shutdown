package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type DownloaderType string

const (
	DownloaderTypeAuto           DownloaderType = "AUTO"
	DownloaderTypeSteam          DownloaderType = "STEAM"
	DownloaderTypeXbox           DownloaderType = "XBOX"
	DownloaderTypeEpic           DownloaderType = "EPIC"
	DownloaderTypeBattleNet      DownloaderType = "BATTLE_NET"
	DownloaderTypeEAApp          DownloaderType = "EA_APP"
	DownloaderTypeUbisoftConnect DownloaderType = "UBISOFT_CONNECT"
)

type Settings struct {
	NetworkThresholdKbps        float64        `json:"networkThresholdKbps"`
	DiskThresholdMBps           float64        `json:"diskThresholdMBps"`
	TrackDiskUsage              bool           `json:"trackDiskUsage"`
	IdleDuration                time.Duration  `json:"idleDuration"`
	CountdownDuration           time.Duration  `json:"countdownDuration"`
	Action                      string         `json:"action"`
	DownloaderType              DownloaderType `json:"downloaderType"`
	UseBitsPerSecond            bool           `json:"useBitsPerSecond"`
	SampleIntervalSeconds       int            `json:"sampleIntervalSeconds"`
	PauseWhenTrackedAppsRunning bool           `json:"pauseWhenTrackedAppsRunning"`
	TrackedApps                 []string       `json:"trackedApps"`
}

func DefaultSettings() Settings {
	return Settings{
		NetworkThresholdKbps:        50,
		DiskThresholdMBps:           1,
		TrackDiskUsage:              true,
		IdleDuration:                20 * time.Second,
		CountdownDuration:           10 * time.Second,
		Action:                      "shutdown",
		DownloaderType:              DownloaderTypeAuto,
		UseBitsPerSecond:            false,
		SampleIntervalSeconds:       1,
		PauseWhenTrackedAppsRunning: false,
		TrackedApps:                 []string{},
	}
}

func isValidDownloaderType(t DownloaderType) bool {
	switch t {
	case DownloaderTypeAuto,
		DownloaderTypeSteam,
		DownloaderTypeXbox,
		DownloaderTypeEpic,
		DownloaderTypeBattleNet,
		DownloaderTypeEAApp,
		DownloaderTypeUbisoftConnect:
		return true
	default:
		return false
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
	if !isValidDownloaderType(s.DownloaderType) {
		s.DownloaderType = d.DownloaderType
	}
	if s.SampleIntervalSeconds <= 0 {
		s.SampleIntervalSeconds = d.SampleIntervalSeconds
	}
	if s.TrackedApps == nil {
		s.TrackedApps = []string{}
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
	var raw struct {
		Settings
		TrackDiskUsage *bool `json:"trackDiskUsage"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return DefaultSettings(), err
	}
	s := raw.Settings
	if raw.TrackDiskUsage == nil {
		s.TrackDiskUsage = DefaultSettings().TrackDiskUsage
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
