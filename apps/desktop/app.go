package main

import (
  "context"
)

// App struct — semua method di sini otomatis ter-expose ke frontend via Wails
type App struct {
  ctx     context.Context
  running bool
}

func NewApp() *App {
  return &App{}
}

func (a *App) startup(ctx context.Context) {
  a.ctx = ctx
}

// StartMonitor memulai monitoring network + disk
func (a *App) StartMonitor() {
  // TODO: integrasikan internal/monitor
  a.running = true
}

// StopMonitor menghentikan monitoring
func (a *App) StopMonitor() {
  a.running = false
}

// CancelShutdown membatalkan countdown shutdown
func (a *App) CancelShutdown() {
  // TODO: integrasikan internal/engine
}

// GetMetrics mengembalikan metrics saat ini (polling fallback)
func (a *App) GetMetrics() map[string]float64 {
  return map[string]float64{
    "networkKbps": 0,
    "diskMBps":    0,
  }
}
