// Shim agar bisa develop di browser tanpa Wails runtime
// Di dalam Wails, window.go akan tersedia secara otomatis

declare global {
  interface Window {
    go?: {
      main: {
        App: {
          StartMonitor: () => Promise<void>
          StopMonitor: () => Promise<void>
          CancelShutdown: () => Promise<void>
          GetMetrics: () => Promise<Record<string, number>>
        }
      }
    }
  }
}

export async function startMonitor(): Promise<void> {
  if (window.go) return window.go.main.App.StartMonitor()
  console.warn('[dev] Wails not available — using mock')
}

export async function stopMonitor(): Promise<void> {
  if (window.go) return window.go.main.App.StopMonitor()
}

export async function cancelShutdown(): Promise<void> {
  if (window.go) return window.go.main.App.CancelShutdown()
}

export async function getMetrics(): Promise<Record<string, number>> {
  if (window.go) return window.go.main.App.GetMetrics()
  return { networkKbps: 0, diskMBps: 0 }
}
