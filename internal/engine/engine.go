package engine

import "time"

type State string

const (
  StateActive        State = "ACTIVE"
  StateIdleCandidate State = "IDLE_CANDIDATE"
  StateConfirmedIdle State = "CONFIRMED_IDLE"
  StateCountdown     State = "COUNTDOWN"
  StateShutdown      State = "SHUTDOWN"
)

type Config struct {
  NetworkThresholdKbps float64
  DiskThresholdMBps    float64
  IdleDuration         time.Duration
  CountdownDuration    time.Duration
}

type Engine struct {
  State     State
  Config    Config
  idleSince time.Time
  cancelled bool
}

func New(cfg Config) *Engine {
  return &Engine{
    State:  StateActive,
    Config: cfg,
  }
}

func (e *Engine) Tick(networkKbps, diskMBps float64) State {
  isIdle := networkKbps < e.Config.NetworkThresholdKbps &&
    diskMBps < e.Config.DiskThresholdMBps

  switch e.State {
  case StateActive:
    if isIdle {
      e.State = StateIdleCandidate
      e.idleSince = time.Now()
    }

  case StateIdleCandidate:
    if !isIdle {
      e.State = StateActive
    } else if time.Since(e.idleSince) >= e.Config.IdleDuration/2 {
      e.State = StateConfirmedIdle
    }

  case StateConfirmedIdle:
    if !isIdle {
      e.State = StateActive
    } else if time.Since(e.idleSince) >= e.Config.IdleDuration {
      e.State = StateCountdown
      e.cancelled = false
    }

  case StateCountdown:
    if !isIdle {
      e.State = StateActive // spike → auto cancel
    } else if e.cancelled {
      e.State = StateActive
    }

  case StateShutdown:
    // terminal state
  }

  return e.State
}

func (e *Engine) Cancel() {
  if e.State == StateCountdown {
    e.cancelled = true
  }
}

func (e *Engine) ConfirmShutdown() {
  e.State = StateShutdown
}
