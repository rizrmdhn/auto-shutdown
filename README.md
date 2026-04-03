# Auto Shutdown

Desktop app to monitor network and disk activity, then automatically run a power action (shutdown, sleep, hibernate) when activity becomes idle.

## Features

- Real-time network and disk monitoring.
- Idle detection engine with countdown before power action.
- Optional disk tracking toggle (network-only mode supported).
- Launcher-aware behavior (Steam, Epic, Xbox, Battle.net, EA App, Ubisoft Connect, or custom process names).
- Live throughput chart with selectable time range.
- Persistent settings stored locally.

## Supported Launchers

- AUTO mode (pattern-based detection)
- Steam
- Xbox
- Epic Games Launcher
- Battle.net
- EA App
- Ubisoft Connect
- Custom process names (manual list in Settings)

Default process names:

- Steam: `steam.exe`, `steamservice.exe`, `steamwebhelper.exe`
- Xbox: `gamingservices.exe`, `gamingservicesnet.exe`, `xboxpcapp.exe`, `xboxappservices.exe`, `xboxgamebar.exe`
- Epic Games Launcher: `epicgameslauncher.exe`, `epiconlineservicesuserhelper.exe`
- Battle.net: `battle.net.exe`, `agent.exe`, `blizzard update agent.exe`
- EA App: `eadesktop.exe`, `eabackgroundservice.exe`, `origin.exe`
- Ubisoft Connect: `upc.exe`, `ubisoftconnect.exe`

AUTO mode fallback patterns:

- `steam`, `gamingservices`, `xbox`, `epic`, `battle.net`, `blizzard`, `agent`, `ea`, `origin`, `ubisoft`, `uplay`

## Tech Stack

- Frontend: React 19, Vite, TanStack Router, Tailwind CSS v4, Zustand, Recharts.
- Desktop shell: Wails v2 (Go + WebView2).
- System metrics: gopsutil.
- Monorepo tooling: pnpm + Turborepo.

## Monorepo Layout

- apps/web: frontend UI (also used as Wails frontend)
- apps/desktop: desktop app host and Wails integration
- internal: shared Go packages (monitor, engine, config, executor)
- packages/config: shared TS config package

## Prerequisites

- Node.js 18+
- pnpm 10+
- Go 1.21+
- Wails CLI:

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

- Microsoft WebView2 Runtime (Windows)

## Install

```bash
pnpm install
```

## Development

From repo root:

```bash
# Run all dev tasks through turborepo
pnpm dev

# Run desktop app in Wails dev mode
pnpm wails

# Run web app only (browser)
pnpm --filter @auto-shutdown/web dev
```

## Build

From repo root:

```bash
# Build all workspaces
pnpm build

# Build desktop executable
pnpm wails-build
```

Desktop output:

```text
apps/desktop/build/bin/auto-shutdown.exe
```

You can also build directly from desktop workspace:

```bash
pnpm --filter @auto-shutdown/desktop wails-build
```

## Release Automation

GitHub Actions workflow is available at:

```text
.github/workflows/release-desktop.yml
```

What it does:

1. Type-checks the web app first (`tsc --noEmit`).
2. Builds Windows desktop app in CI.
3. Generates release notes with git-cliff using Conventional Commits.
4. Publishes a GitHub Release and attaches `auto-shutdown.exe`.

Release triggers:

- Push a tag matching `v*` (example: `v1.0.0`)
- Manual workflow dispatch (with tag input)

## Settings Storage

Settings are saved in the user config directory under:

```text
auto-shutdown/config.json
```
