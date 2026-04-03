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
	IdleDurationSeconds         int      `json:"idleDurationSeconds"`
	CountdownDurationSeconds    int      `json:"countdownDurationSeconds"`
	Action                      string   `json:"action"`
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
	return SettingsDTO{
		NetworkThresholdKbps:        s.NetworkThresholdKbps,
		DiskThresholdMBps:           s.DiskThresholdMBps,
		IdleDurationSeconds:         int(s.IdleDuration.Seconds()),
		CountdownDurationSeconds:    int(s.CountdownDuration.Seconds()),
		Action:                      s.Action,
		SampleIntervalSeconds:       s.SampleIntervalSeconds,
		PauseWhenTrackedAppsRunning: s.PauseWhenTrackedAppsRunning,
		TrackedApps:                 append([]string(nil), s.TrackedApps...),
	}
}

func fromDTO(dto SettingsDTO) config.Settings {
	s := config.Settings{
		NetworkThresholdKbps:        dto.NetworkThresholdKbps,
		DiskThresholdMBps:           dto.DiskThresholdMBps,
		IdleDuration:                time.Duration(dto.IdleDurationSeconds) * time.Second,
		CountdownDuration:           time.Duration(dto.CountdownDurationSeconds) * time.Second,
		Action:                      dto.Action,
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
		trackedRunning = a.isTrackedAppRunning(settings.TrackedApps)
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

func (a *App) isTrackedAppRunning(processNames []string) bool {
	if len(processNames) == 0 {
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

	if len(lookup) == 0 {
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
		_, ok := lookup[strings.ToLower(name)]
		if ok {
			return true
		}
	}

	return false
}

func (a *App) tick() error {
	a.mu.RLock()
	m := a.monitor
	settings := a.settings
	a.mu.RUnlock()

	if m == nil {
		return nil
	}

	if settings.PauseWhenTrackedAppsRunning && a.isTrackedAppRunning(settings.TrackedApps) {
		a.mu.Lock()
		if a.engine != nil {
			a.engine.Tick(settings.NetworkThresholdKbps+1, settings.DiskThresholdMBps+1)
		}
		a.countdown = time.Time{}
		a.mu.Unlock()
		return nil
	}

	metric, err := m.Sample()
	if err != nil {
		return err
	}

	a.mu.Lock()
	a.lastMetric = *metric
	if a.engine == nil {
		a.mu.Unlock()
		return nil
	}

	prevState := a.engine.State
	state := a.engine.Tick(metric.NetworkKbps, metric.DiskMBps)

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
