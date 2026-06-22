# AGENTS.md

> Agent workflow specification for the Xinjiang Self-Drive route visualization app.

## 1. Project Overview

A production-grade, map-first travel route visualization web app for a 13-day Xinjiang self-driving itinerary. The app renders daily driving routes as interactive map polylines and keeps the map, sidebar, and timeline slider in sync through a centralized Zustand store.

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Map Components | mapcn (https://www.mapcn.dev) |
| State Management | Zustand |
| Icons | Lucide React (default for shadcn) |
| Package Manager | pnpm |

## Performance Rules

- Preload all route data at build/import time; no runtime fetching.
- Memoize polyline rendering with `React.memo`.
- Avoid passing new object/array references to polylines on every render.
- Do not re-render the map instance when sidebar/timeline state changes.
- Use `useShallow` from Zustand when selecting partial state to avoid unnecessary re-renders.

## Git Workflow
All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

| Type | Use When |
|------|----------|
| `feat` | Adding a new feature or user-facing behavior |
| `fix` | Fixing a bug |
| `docs` | Documentation-only changes |
| `style` | Code style changes (formatting, semicolons, etc.) without logic changes |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build, tooling, dependency, or maintenance tasks |
| `ci` | Continuous integration changes |
