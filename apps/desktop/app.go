package main

import (
	"context"
	"log"
	"sync"
	"time"

	"auto-shutdown/internal/config"
	"auto-shutdown/internal/engine"
	"auto-shutdown/internal/executor"
	"auto-shutdown/internal/monitor"
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

// StartMonitor memulai monitoring network + disk
func (a *App) StartMonitor() {
	a.mu.Lock()
	if a.running {
		a.mu.Unlock()
		return
	}

	a.monitor = monitor.New()
	a.engine = engine.New(engine.Config{
		NetworkThresholdKbps: a.settings.NetworkThresholdKbps,
		DiskThresholdMBps:    a.settings.DiskThresholdMBps,
		IdleDuration:         a.settings.IdleDuration,
		CountdownDuration:    a.settings.CountdownDuration,
	})
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
	ticker := time.NewTicker(time.Second)
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
	a.mu.RUnlock()

	if m == nil {
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

	if time.Since(a.countdown) < a.settings.CountdownDuration {
		a.mu.Unlock()
		return nil
	}

	action := executor.Action(a.settings.Action)
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
