# @matchflow/ui

Part of the **"one engine, two doors"** Matchflow monorepo architecture.

## Role

`ui` is the **shared component library** used by both the fan surface (`apps/web/(fan)`) and the ops surface (`apps/web/(ops)`). Components in this package are:

- Designed to work in both contexts (fan-facing and ops-facing)
- Styled using the shared Matchflow design system (`globals.css` CSS custom properties)
- Accessibility-compliant at WCAG 2.2 AA — every component follows the patterns verified in the §9 accessibility pass

## Components

### `<RouteCard />`

Displays a wayfinding route result. Used in the Fan Concierge chat (after AI routing) and the Volunteer Command Center.

| Prop               | Type                          | Description                                    |
| ------------------ | ----------------------------- | ---------------------------------------------- |
| `destinationName`  | `string`                      | Human-readable destination label               |
| `totalTimeSeconds` | `number`                      | Walking time estimate                          |
| `isAccessible`     | `boolean`                     | Whether the route used the accessible subgraph |
| `pathNodesCount`   | `number`                      | Number of waypoints in the path                |
| `congestionLevel`  | `'low' \| 'medium' \| 'high'` | Visual congestion indicator                    |

### `<Info />`

Informational inline message component. `role="note"`, no live region.

### `<AlertCircle />`

Error/warning inline message. `role="alert"` — announced immediately by screen readers.

## Design System Tokens

All components use the CSS custom properties defined in `apps/web/src/app/globals.css`:

```css
--primary-accent: #fbbf24 /* FIFA Gold */ --secondary-accent: #34d399 /* Status Green */
  --alert-accent: #ef4444 /* Alert Red */ --bg-base: #0f172a /* Deep Navy */ --bg-surface: #1e293b
  --bg-surface-elevated: #334155 --text-primary: #f1f5f9 --text-secondary: #94a3b8
  --border-color: rgba(255, 255, 255, 0.08);
```

## Accessibility Guarantees

- All interactive components have visible focus rings (`:focus-visible` outlines)
- Icon-only components always have an `aria-label`; purely decorative icons have `aria-hidden="true"`
- Color is never the sole conveyor of information — color is always paired with a text label or icon
- Components respect `prefers-reduced-motion` — animations are suppressed when the user has requested it

## Architecture Position

```
  @matchflow/ui   ← YOU ARE HERE
       │
       ├── imported by apps/web/(fan) pages
       └── imported by apps/web/(ops) pages
```

## Adding New Components

1. Create the component in `src/components/`
2. Export it from `src/index.tsx`
3. Follow the WCAG 2.2 AA accessibility checklist in `§9` of the master build document before shipping
