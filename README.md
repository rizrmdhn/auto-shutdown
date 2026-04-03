# Auto Shutdown

Aplikasi desktop cross-platform untuk auto shutdown saat download selesai.

## Stack
- **Frontend**: React + Vite + TanStack Router + TailwindCSS + Zustand
- **Desktop**: Wails v2 (Go + WebView2)
- **Monitoring**: gopsutil (network + disk)

## Prerequisites
- Node.js >= 18
- pnpm >= 8
- Go >= 1.21
- Wails v2: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- WebView2 Runtime (Windows — biasanya sudah ada)

## Setup
```bash
pnpm install
```

## Development
```bash
# Frontend only (browser)
pnpm --filter @auto-shutdown/web dev

# Desktop (Wails dev mode)
cd apps/desktop && wails dev
```

## Build
```bash
cd apps/desktop && wails build
```
Output: `apps/desktop/build/bin/auto-shutdown.exe`
