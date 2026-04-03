package main

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"auto-shutdown/internal/config"
	"auto-shutdown/internal/engine"
	"auto-shutdown/internal/executor"
	"auto-shutdown/internal/monitor"

	"github.com/shirou/gopsutil/v3/process"
)

// App struct — semua method di sini otomatis ter-expose ke frontend via Wails
type App struct {
	ctx context.Context

	mu         sync.RWMutex
	running    bool
	settings   config.Settings
	monitor    *monitor.Monitor
	engine     *engine.Engine
	lastMetric monitor.Metrics
	countdown  time.Time
	stopCh     chan struct{}
}

type SettingsDTO struct {
	NetworkThresholdKbps        float64  `json:"networkThresholdKbps"`
	DiskThresholdMBps           float64  `json:"diskThresholdMBps"`
	TrackDiskUsage              bool     `json:"trackDiskUsage"`
	IdleDurationSeconds         int      `json:"idleDurationSeconds"`
	CountdownDurationSeconds    int      `json:"countdownDurationSeconds"`
	Action                      string   `json:"action"`
	DownloaderType              string   `json:"downloaderType"`
	UseBitsPerSecond            bool     `json:"useBitsPerSecond"`
	SampleIntervalSeconds       int      `json:"sampleIntervalSeconds"`
	PauseWhenTrackedAppsRunning bool     `json:"pauseWhenTrackedAppsRunning"`
	TrackedApps                 []string `json:"trackedApps"`
}

type StatusDTO struct {
	Running           bool   `json:"running"`
	State             string `json:"state"`
	CountdownSeconds  int    `json:"countdownSeconds"`
	TrackedAppRunning bool   `json:"trackedAppRunning"`
}

var processNamesByDownloader = map[config.DownloaderType][]string{
	config.DownloaderTypeAuto: {},
	config.DownloaderTypeSteam: {
		"steam.exe",
		"steamservice.exe",
		"steamwebhelper.exe",
	},
	config.DownloaderTypeXbox: {
		"gamingservices.exe",
		"gamingservicesnet.exe",
		"xboxpcapp.exe",
		"xboxappservices.exe",
		"xboxgamebar.exe",
	},
	config.DownloaderTypeEpic: {
		"epicgameslauncher.exe",
		"epiconlineservicesuserhelper.exe",
	},
	config.DownloaderTypeBattleNet: {
		"battle.net.exe",
		"agent.exe",
		"blizzard update agent.exe",
	},
	config.DownloaderTypeEAApp: {
		"eadesktop.exe",
		"eabackgroundservice.exe",
		"origin.exe",
	},
	config.DownloaderTypeUbisoftConnect: {
		"upc.exe",
		"ubisoftconnect.exe",
	},
}

var autoFallbackPatterns = []string{
	"steam",
	"gamingservices",
	"xbox",
	"epic",
	"battle.net",
	"blizzard",
	"agent",
	"ea",
	"origin",
	"ubisoft",
	"uplay",
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	s, err := config.Load()
	if err != nil {
		log.Printf("failed to load settings, using defaults: %v", err)
	}

	a.mu.Lock()
	a.settings = s
	a.monitor = monitor.New()
	a.engine = engine.New(engine.Config{
		NetworkThresholdKbps: s.NetworkThresholdKbps,
		DiskThresholdMBps:    s.DiskThresholdMBps,
		IdleDuration:         s.IdleDuration,
		CountdownDuration:    s.CountdownDuration,
	})
	a.mu.Unlock()
}

func toDTO(s config.Settings) SettingsDTO {
	trackedApps := append([]string{}, s.TrackedApps...)
	if trackedApps == nil {
		trackedApps = []string{}
	}

	return SettingsDTO{
		NetworkThresholdKbps:        s.NetworkThresholdKbps,
		DiskThresholdMBps:           s.DiskThresholdMBps,
		TrackDiskUsage:              s.TrackDiskUsage,
		IdleDurationSeconds:         int(s.IdleDuration.Seconds()),
		CountdownDurationSeconds:    int(s.CountdownDuration.Seconds()),
		Action:                      s.Action,
		DownloaderType:              string(s.DownloaderType),
		UseBitsPerSecond:            s.UseBitsPerSecond,
		SampleIntervalSeconds:       s.SampleIntervalSeconds,
		PauseWhenTrackedAppsRunning: s.PauseWhenTrackedAppsRunning,
		TrackedApps:                 trackedApps,
	}
}

func fromDTO(dto SettingsDTO) config.Settings {
	s := config.Settings{
		NetworkThresholdKbps:        dto.NetworkThresholdKbps,
		DiskThresholdMBps:           dto.DiskThresholdMBps,
		TrackDiskUsage:              dto.TrackDiskUsage,
		IdleDuration:                time.Duration(dto.IdleDurationSeconds) * time.Second,
		CountdownDuration:           time.Duration(dto.CountdownDurationSeconds) * time.Second,
		Action:                      dto.Action,
		DownloaderType:              config.DownloaderType(dto.DownloaderType),
		UseBitsPerSecond:            dto.UseBitsPerSecond,
		SampleIntervalSeconds:       dto.SampleIntervalSeconds,
		PauseWhenTrackedAppsRunning: dto.PauseWhenTrackedAppsRunning,
		TrackedApps:                 append([]string(nil), dto.TrackedApps...),
	}

	if s.IdleDuration <= 0 {
		s.IdleDuration = config.DefaultSettings().IdleDuration
	}
	if s.CountdownDuration <= 0 {
		s.CountdownDuration = config.DefaultSettings().CountdownDuration
	}

	return s
}

func (a *App) rebuildEngineLocked() {
	a.engine = engine.New(engine.Config{
		NetworkThresholdKbps: a.settings.NetworkThresholdKbps,
		DiskThresholdMBps:    a.settings.DiskThresholdMBps,
		IdleDuration:         a.settings.IdleDuration,
		CountdownDuration:    a.settings.CountdownDuration,
	})
}

func (a *App) GetSettings() SettingsDTO {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return toDTO(a.settings)
}

func (a *App) SaveSettings(input SettingsDTO) error {
	settings := fromDTO(input)
	if err := config.Save(settings); err != nil {
		return err
	}
	normalized, err := config.Load()
	if err != nil {
		log.Printf("failed to reload normalized settings: %v", err)
		normalized = settings
	}

	a.mu.Lock()
	a.settings = normalized
	a.rebuildEngineLocked()
	a.countdown = time.Time{}
	a.mu.Unlock()

	return nil
}

func buildTrackedMatchers(settings config.Settings) ([]string, []string) {
	exact := make([]string, 0, len(settings.TrackedApps)+8)
	patterns := make([]string, 0, 8)

	if base, ok := processNamesByDownloader[settings.DownloaderType]; ok {
		exact = append(exact, base...)
	}
	if settings.DownloaderType == config.DownloaderTypeAuto {
		patterns = append(patterns, autoFallbackPatterns...)
	}

	exact = append(exact, settings.TrackedApps...)

	return exact, patterns
}

func matchesFallbackPattern(processName string, pattern string) bool {
	// Short patterns like "ea" are too broad with plain contains; require prefix.
	if len(pattern) <= 3 {
		return strings.HasPrefix(processName, pattern)
	}

	return strings.Contains(processName, pattern)
}

func (a *App) isTrackedAppRunning(processNames []string, fallbackPatterns []string) bool {
	if len(processNames) == 0 && len(fallbackPatterns) == 0 {
		return false
	}

	lookup := make(map[string]struct{}, len(processNames))
	for _, name := range processNames {
		trimmed := strings.ToLower(strings.TrimSpace(name))
		if trimmed == "" {
			continue
		}
		lookup[trimmed] = struct{}{}
	}

	patterns := make([]string, 0, len(fallbackPatterns))
	for _, pattern := range fallbackPatterns {
		trimmed := strings.ToLower(strings.TrimSpace(pattern))
		if trimmed == "" {
			continue
		}
		patterns = append(patterns, trimmed)
	}

	if len(lookup) == 0 && len(patterns) == 0 {
		return false
	}

	procs, err := process.Processes()
	if err != nil {
		return false
	}

	for _, p := range procs {
		name, err := p.Name()
		if err != nil {
			continue
		}
		lower := strings.ToLower(name)
		if _, ok := lookup[lower]; ok {
			return true
		}
		for _, pattern := range patterns {
			if matchesFallbackPattern(lower, pattern) {
				return true
			}
		}
	}

	return false
}

func (a *App) GetStatus() StatusDTO {
	a.mu.RLock()
	settings := a.settings
	running := a.running
	countdown := a.countdown
	state := engine.StateActive
	if a.engine != nil {
		state = a.engine.State
	}
	a.mu.RUnlock()

	trackedRunning := false
	if settings.PauseWhenTrackedAppsRunning {
		exact, patterns := buildTrackedMatchers(settings)
		trackedRunning = a.isTrackedAppRunning(exact, patterns)
	}

	countdownSeconds := 0
	if !countdown.IsZero() {
		remaining := settings.CountdownDuration - time.Since(countdown)
		if remaining > 0 {
			countdownSeconds = int(remaining.Round(time.Second).Seconds())
		}
	}

	return StatusDTO{
		Running:           running,
		State:             string(state),
		CountdownSeconds:  countdownSeconds,
		TrackedAppRunning: trackedRunning,
	}
}

// StartMonitor memulai monitoring network + disk
func (a *App) StartMonitor() {
	a.mu.Lock()
	if a.running {
		a.mu.Unlock()
		return
	}

	a.monitor = monitor.New()
	a.rebuildEngineLocked()
	a.countdown = time.Time{}

	a.stopCh = make(chan struct{})
	a.running = true
	stopCh := a.stopCh
	a.mu.Unlock()

	go a.runMonitorLoop(stopCh)
}

// StopMonitor menghentikan monitoring
func (a *App) StopMonitor() {
	a.mu.Lock()
	if !a.running {
		a.mu.Unlock()
		return
	}
	a.running = false
	a.countdown = time.Time{}
	if a.stopCh != nil {
		close(a.stopCh)
		a.stopCh = nil
	}
	a.mu.Unlock()
}

// CancelShutdown membatalkan countdown shutdown
func (a *App) CancelShutdown() {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.engine != nil {
		a.engine.Cancel()
	}
	a.countdown = time.Time{}
}

// GetMetrics mengembalikan metrics saat ini (polling fallback)
func (a *App) GetMetrics() map[string]float64 {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return map[string]float64{
		"networkKbps": a.lastMetric.NetworkKbps,
		"diskMBps":    a.lastMetric.DiskMBps,
	}
}

func (a *App) runMonitorLoop(stopCh <-chan struct{}) {
	a.mu.RLock()
	intervalSeconds := a.settings.SampleIntervalSeconds
	a.mu.RUnlock()
	if intervalSeconds <= 0 {
		intervalSeconds = 1
	}

	ticker := time.NewTicker(time.Duration(intervalSeconds) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-stopCh:
			return
		case <-ticker.C:
			if err := a.tick(); err != nil {
				log.Printf("monitor tick failed: %v", err)
			}
		}
	}
}

func (a *App) tick() error {
	a.mu.RLock()
	m := a.monitor
	settings := a.settings
	a.mu.RUnlock()

	if m == nil {
		return nil
	}

	metric, err := m.Sample()
	if err != nil {
		return err
	}

	trackedRunning := false
	if settings.PauseWhenTrackedAppsRunning {
		exact, patterns := buildTrackedMatchers(settings)
		trackedRunning = a.isTrackedAppRunning(exact, patterns)
	}

	a.mu.Lock()
	a.lastMetric = *metric
	if a.engine == nil {
		a.mu.Unlock()
		return nil
	}

	if trackedRunning {
		a.engine.Tick(settings.NetworkThresholdKbps+1, settings.DiskThresholdMBps+1)
		a.countdown = time.Time{}
		a.mu.Unlock()
		return nil
	}

	prevState := a.engine.State
	diskMBps := metric.DiskMBps
	if !settings.TrackDiskUsage {
		diskMBps = 0
	}
	state := a.engine.Tick(metric.NetworkKbps, diskMBps)

	if state == engine.StateCountdown && prevState != engine.StateCountdown {
		a.countdown = time.Now()
	}

	if state != engine.StateCountdown {
		a.countdown = time.Time{}
		a.mu.Unlock()
		return nil
	}

	if a.countdown.IsZero() {
		a.countdown = time.Now()
		a.mu.Unlock()
		return nil
	}

	if time.Since(a.countdown) < settings.CountdownDuration {
		a.mu.Unlock()
		return nil
	}

	action := executor.Action(settings.Action)
	a.mu.Unlock()

	if err := executor.Execute(action); err != nil {
		return err
	}

	a.mu.Lock()
	if a.engine != nil && a.engine.State == engine.StateCountdown {
		a.engine.ConfirmShutdown()
	}
	a.mu.Unlock()

	return nil
}
