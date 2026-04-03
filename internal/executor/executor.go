package executor

import (
  "fmt"
  "os/exec"
  "runtime"
)

type Action string

const (
  ActionShutdown  Action = "shutdown"
  ActionSleep     Action = "sleep"
  ActionHibernate Action = "hibernate"
)

func Execute(action Action) error {
  switch runtime.GOOS {
  case "windows":
    return executeWindows(action)
  default:
    return fmt.Errorf("unsupported OS: %s", runtime.GOOS)
  }
}

func executeWindows(action Action) error {
  var args []string
  switch action {
  case ActionShutdown:
    args = []string{"shutdown", "/s", "/t", "0"}
  case ActionSleep:
    args = []string{"rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"}
  case ActionHibernate:
    args = []string{"shutdown", "/h"}
  default:
    return fmt.Errorf("unknown action: %s", action)
  }
  return exec.Command(args[0], args[1:]...).Run()
}
