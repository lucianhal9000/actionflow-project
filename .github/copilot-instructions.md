# ActionFlow Copilot Instructions

## Project Overview

**ActionFlow** is a React-based action item manager with offline-first architecture. It manages tasks with priorities, action types (remind, email, calendar, prioritize), and syncs with a backend email service. The app uses `window.storage` (originally Claude API) with a localStorage fallback for persistence.

## Architecture Patterns

### Frontend (React + Vite)
- **State Management**: Single `App` component using React hooks (useState, useCallback, useMemo)
- **Storage Layer**: `window.storage` API with localStorage shim in [src/main.jsx](src/main.jsx#L8-L21)
  - Methods: `get(key)`, `set(key, value)`, `delete(key)`, `list(prefix)`
  - Always handle null/async responses: `const res = await window.storage.get(key); return res?.value`
- **Offline Queue**: Items queued in `aim_offline_queue` key when offline; merged on reconnect in `toggleOnline()`
- **Data Model**: Items have `id`, `title`, `description`, `type`, `priority`, `dueDate`, `emailTo`, `calTitle`, `calStart`, `done`, `starred`, `createdAt`

### UI Components (Inline, No Library)
- **Input**: Controlled input with label and focus border animation
- **Chip**: Toggle button for type/priority selection with active state color
- **ItemCard**: Displays action item with metadata (type badge, priority dot, due date, email target)
- **Modal**: Dismissible form wrapper with backdrop blur
- **StatsBar**: Displays Total, Done, Urgent counts + progress bar
- **BgMesh**: Animated gradient background using CSS keyframes

### Backend Email Handler
- **File**: [api/send-email.js](api/send-email.js)
- **Auth**: Checks `x-actionflow-secret` header against `ACTIONFLOW_WEBHOOK_SECRET` env var
- **Integration**: Posts to Resend API with Bearer token (`RESEND_API_KEY`)
- **Validation**: Requires `to`, `subject`, `from`, `text|html`

## Key Workflows & Commands

```bash
# Development
npm run dev           # Vite dev server on localhost:5173
npm run build        # Builds for production (fallback: React Scripts → Vite)
npm run preview      # Preview production build locally

# Git (already initialized)
git status
git push -u origin main
```

## Project-Specific Conventions

### Color & Style System
- **Dark Mode**: `#0f172a` (bg), `#1e293b` (card), `#e2e8f0` (text)
- **Type Colors** (stored in `ACTION_TYPES` constant):
  - Remind: `#818cf8` (indigo)
  - Email: `#38bdf8` (cyan)
  - Calendar: `#a78bfa` (purple)
  - Prioritize: `#fb923c` (orange)
- **Priority Colors** (in `PRIO_COLOR` map):
  - Low: `#4ade80`, Medium: `#facc15`, High: `#fb923c`, Urgent: `#f43f5e`

### Filtering & Sorting
- **Filters**: "All" | "remind" | "email" | "calendar" | "prioritize"
- **Sort Options**: "createdAt" (newest first), "priority" (desc), "dueDate"
- **Starred items always appear first** (sort override in `filtered` useMemo)

### State Updates & Queue Logic
When offline (`!isOnline`):
- Add operation to `offlineQueue` via `addToQueue({ action, ...metadata })`
- Still update UI locally (optimistic updates)
- **Actions**: "add", "delete", "toggle", "update", "star"
- On reconnect: merge queue into items, then clear queue

### Styling Approach
- **All inline styles** (no CSS files except Google Fonts link)
- **Animations**: CSS keyframes injected via `<style>` tags in components
  - `toastIn` (2.2s auto-close), `modalIn`, `cardIn`, `meshDrift1/2/3` (background)
- **Focus states**: Use `onFocus/onBlur` to change `borderColor`

## Integration Points

### Email Action Type
When type is "email", item includes `emailTo` field. No automatic sending in UI—intended for backend webhook integration via [api/send-email.js](api/send-email.js).

### Calendar Action Type
Stores `calTitle` and `calStart` (datetime-local input). UI displays as metadata but does not integrate with external calendar services.

### Offline Badge
Displays queue count (`{offlineQueue.length} queued`) and warning banner only when offline.

## Common Development Tasks

- **Add a new field to items**: Update `ItemForm` inputs → `handleSave` destructuring → `ItemCard` display → `loadItems` parsing (if persisted)
- **Add action type**: Add to `ACTION_TYPES` array with `{ key, label, icon, color }` → Chip renders automatically
- **Change dark theme**: Update `#0f172a`, `#1e293b`, `#e2e8f0` color values (search all inline styles)
- **Debug storage**: Inspect `localStorage.aim_items` and `localStorage.aim_offline_queue` in DevTools
- **Test offline**: Toggle "Online/Offline" button in header to simulate network states
