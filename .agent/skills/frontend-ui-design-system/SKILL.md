---
name: frontend-ui-design-system
description: >-
  Comprehensive frontend UI design system and styling standards for the entire project.
  Activate this skill whenever creating new pages, modifying existing views, redesigning dashboards,
  building components, styling forms, tables, modals, cards, or implementing responsive desktop/mobile layouts.
---

# Frontend UI Design System & Component Guidelines

This skill defines the official design system, visual standards, component architecture, and implementation rules for all frontend engineering across the application.

Every frontend task—whether building a new page, updating an existing component, fixing a layout bug, or polishing a user interface—must strictly adhere to these specifications.

---

## 1. Core Visual Principles & Design Language

1. **Clean, Modern & Uncluttered**: Avoid visual clutter, heavy dark borders, harsh pure blacks (`#000000`), or neon accents. Embrace subtle backgrounds, crisp borders, generous breathing room, and soft elevations.
2. **Predictable Consistency**: Every button, input, card, badge, and modal must look and behave identically across all dashboard roles (Admin, QA Lead, Developer, QA Member, Project Lead).
3. **Information Hierarchy**: Critical metrics and primary CTAs must stand out immediately; secondary actions and meta details must recede gracefully using muted tones and smaller scale.
4. **Deliberate Micro-Interactions**: Buttons, tabs, and interactive rows must provide subtle hover, active, and focus transitions (150ms–200ms ease) without jarring layout shifts.
5. **Preservation of Business Logic**: Design changes must NEVER alter API endpoints, request/response formats, URL query params, authentication state, or role permissions.

---

## 2. Professional Blue Color System

All colors must be referenced using the project's CSS design tokens defined in `src/styles/design-system.css`.

### Primary & Accent Palette

| Token / Role | Hex Code | RGB Equivalent | HSL Equivalent | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Brand)** | `#2563EB` | `rgb(37, 99, 235)` | `hsl(221, 83%, 53%)` | Primary CTAs, active links, focus rings, key icons |
| **Primary Hover** | `#1D4ED8` | `rgb(29, 78, 216)` | `hsl(224, 76%, 48%)` | Hover state for primary buttons and active items |
| **Primary Active** | `#1E40AF` | `rgb(30, 64, 175)` | `hsl(226, 71%, 40%)` | Pressed state for primary buttons |
| **Primary Soft** | `#EFF6FF` | `rgb(239, 246, 255)` | `hsl(214, 100%, 97%)` | Badge backgrounds, active row tints, info banners |
| **Primary Border** | `#DBEAFE` | `rgb(219, 234, 254)` | `hsl(214, 95%, 93%)` | Subtle borders for blue banners and highlighted inputs |

### Dark Navy & Neutral Palette

| Token / Role | Hex Code | RGB Equivalent | HSL Equivalent | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **Dark Navy** | `#1E3A8A` | `rgb(30, 58, 138)` | `hsl(224, 64%, 33%)` | Brand accent headers, sidebar active states, notice titles |
| **Text Primary (Ink)** | `#0F172A` | `rgb(15, 23, 42)` | `hsl(222, 47%, 11%)` | Main headings, modal titles, high-emphasis body text |
| **Text Secondary** | `#475569` | `rgb(71, 85, 105)` | `hsl(215, 19%, 35%)` | Subtitles, input labels, secondary descriptions |
| **Text Muted** | `#64748B` | `rgb(100, 116, 139)` | `hsl(215, 16%, 47%)` | Meta timestamps, helper text, breadcrumb links |
| **Text Subtle / Disabled** | `#94A3B8` | `rgb(148, 163, 184)` | `hsl(214, 20%, 65%)` | Placeholders, inactive icons, breadcrumb dividers |

### Surfaces & Backgrounds

| Token / Role | Hex Code | RGB Equivalent | HSL Equivalent | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **App Canvas (Bg)** | `#F1F5F9` | `rgb(241, 245, 249)` | `hsl(210, 40%, 96%)` | Overall page backdrop, dashboard background |
| **Surface (Card/Modal)** | `#FFFFFF` | `rgb(255, 255, 255)` | `hsl(0, 0%, 100%)` | Cards, modals, dropdown menus, table rows |
| **Surface Subtle** | `#F8FAFC` | `rgb(248, 250, 252)` | `hsl(210, 40%, 98%)` | Table headers, disabled inputs, read-only boxes |
| **Border (Line)** | `#E2E8F0` | `rgb(226, 232, 240)` | `hsl(214, 32%, 91%)` | Standard card borders, table dividers, input borders |
| **Border Subtle** | `#EDF0F5` | `rgb(237, 240, 245)` | `hsl(220, 24%, 95%)` | Soft separators, breadcrumb dividers |
| **Border Focus / Hover** | `#CBD5E1` | `rgb(203, 213, 225)` | `hsl(214, 20%, 84%)` | Input hover, button borders |

### Semantic Status Colors

Always pair status badges with their corresponding background, text, and border tints:

```css
/* Active / Pass / Verified / Resolved */
--status-success-bg: #ECFDF5;
--status-success-text: #059669;
--status-success-border: #A7F3D0;
--status-success-dot: #10B981;

/* Pending / In Progress / Planning */
--status-warning-bg: #FFFBEB;
--status-warning-text: #D97706;
--status-warning-border: #FDE68A;
--status-warning-dot: #F59E0B;

/* High / Critical / Failed / Closed */
--status-danger-bg: #FEF2F2;
--status-danger-text: #DC2626;
--status-danger-border: #FECACA;
--status-danger-dot: #EF4444;

/* Untested / General / Informational */
--status-info-bg: #EFF6FF;
--status-info-text: #2563EB;
--status-info-border: #BFDBFE;
--status-info-dot: #3B82F6;
```

---

## 3. Typography System

The application uses **Inter** with system font fallbacks:
`font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;`

| Element | Size | Weight | Line Height | Color | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title (H1)** | `1.5rem` (24px) | `700` (Bold) | `1.25` | `#0F172A` | Top of page, major dashboard sections |
| **Section Header (H2)** | `1.25rem` (20px) | `700` (Bold) | `1.3` | `#0F172A` | Modal headers, card section titles |
| **Card Header (H3)** | `1.0rem` (16px) | `600` (Semi-bold) | `1.4` | `#0F172A` | Metric card headers, table widget titles |
| **Body (Default)** | `0.875rem` (14px) | `400` / `500` | `1.5` | `#334155` | Standard copy, table cell content, descriptions |
| **Form Labels** | `0.8125rem` (13px)| `600` (Semi-bold) | `1.2` | `#334155` | Above input fields, with red `*` for required |
| **Small / Badges** | `0.75rem` (12px) | `600` (Semi-bold) | `1.2` | Contextual | Status pills, count badges, breadcrumbs |
| **Helper / Footers** | `0.75rem` (12px) | `400` (Regular) | `1.3` | `#64748B` | Input help descriptions, subtle hints |

---

## 4. Spacing, Elevation & Shape Scale

### Spacing Scale
- `2xs`: `4px`
- `xs`: `8px`
- `sm`: `12px`
- `md`: `16px`
- `lg`: `20px`
- `xl`: `24px`
- `2xl`: `32px`

### Border Radii
- Pill badges / Avatars: `9999px` (`border-radius: 50%` or `rounded-full`)
- Modals: `16px` or `18px`
- Cards & Containers: `12px` or `14px`
- Inputs & Buttons: `8px` or `9px`
- Tags & Mini Badges: `6px`

### Elevation & Shadows
- **Card Shadow (Resting)**: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`
- **Card Shadow (Hover)**: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`
- **Dropdown / Popover**: `0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05)`
- **Modal Dialog Shadow**: `0 25px 50px -12px rgba(15, 23, 42, 0.25)`

---

## 5. Layout Architecture & Sidebar Navigation

The standard workspace layout consists of a responsive dual-state sidebar and an independent scrollable main content region:

```text
┌──────────────────────────────────────────────────────────────────┐
│  .admin-layout                                                   │
│  ┌────────────────────┬───────────────────────────────────────┐  │
│  │ .sidebar           │ .main-content                         │  │
│  │ (256px / 76px)     │ ┌───────────────────────────────────┐ │  │
│  │                    │ │ .header (Sticky, 68px–72px)       │ │  │
│  │ - Logo             │ │ Breadcrumb / Global Search / User │ │  │
│  │ - Nav items        │ ├───────────────────────────────────┤ │  │
│  │ - Role badges      │ │ Page Body (Scrollable container)  │ │  │
│  │ - Collapse toggle  │ │ Stats Grid / Filters / Tables     │ │  │
│  │                    │ └───────────────────────────────────┘ │  │
│  └────────────────────┴───────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Desktop Sidebar (Expand / Collapse)
- **Expanded Width**: `256px` with full nav labels, section headers, and user profile pill.
- **Collapsed Width**: `76px` with icon-only presentation, centered icons, tooltips on hover, and hidden text.
- **Main Content Transition**: When collapsed, `.main-content` margin shifts smoothly from `256px` to `76px` (`transition: margin-left 0.22s ease`).

### Mobile Navigation (Drawer Slide-in)
- On screens `<= 768px`, the sidebar translates completely off-canvas (`transform: translateX(-100%)`).
- The mobile header renders a dedicated hamburger menu button.
- Clicking the hamburger slides in the sidebar drawer with an overlaid frosted backdrop (`backdrop-filter: blur(4px); background: rgba(15, 23, 42, 0.5)`).
- Navigating to any route automatically closes the drawer and restores body scroll (`body.nav-drawer-open { overflow: hidden; }`).

---

## 6. Standard Component Design Patterns

### A. Buttons

| Type | Background | Text | Border | Hover |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | `#2563EB` | `#FFFFFF` | None | `#1D4ED8`, shadow subtle |
| **Secondary** | `#FFFFFF` | `#334155` | `1px solid #CBD5E1` | `#F8FAFC`, border `#94A3B8` |
| **Ghost / Subtle** | `transparent` | `#64748B` | None | `#F1F5F9`, text `#0F172A` |
| **Danger** | `#EF4444` | `#FFFFFF` | None | `#DC2626` |
| **Danger Outline** | `#FEF2F2` | `#DC2626` | `1px solid #FECACA` | `#FEE2E2` |

- **Height**: Standard `38px`–`40px`, Small `32px`, Large `44px`.
- **Icons**: Lucide icons sized to `16px` with `8px` gap between icon and label.

### B. Form Inputs & Input Groups

Inputs must be clean, single-bordered containers without double outline artifacts:

```css
.input-box {
  display: flex;
  align-items: center;
  height: 40px;
  border: 1.5px solid #CBD5E1;
  border-radius: 9px;
  background: #FFFFFF;
  padding: 0 12px;
  gap: 8px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.input-box:focus-within {
  border-color: #2563EB !important;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
}

.input-box.input-error {
  border-color: #EF4444 !important;
  background: #FFFDFD !important;
}
```

- **Prefixes / Icons**: Country code badge `🇮🇳 +91` or field icon (`UserRound`, `Mail`, `Phone`, `Lock`) rendered in `#64748B` inside the box.
- **Labels**: Always render explicit labels with `req-star` (`<span className="req-star">*</span>`) for mandatory fields.
- **Error Messages**: Clean flex rows below the field with an `AlertCircle` icon and `#DC2626` text.

### C. Modal Dialogs

Modals must look professional, balanced, and perfectly aligned:

1. **Backdrop**: `background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(5px);`.
2. **Card**: White background, `max-width: 660px`, `border-radius: 18px`, `box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25)`.
3. **Header**: Clean flex row with title (`h3`), explanatory subtitle, and a subtle icon close button (`X`).
4. **Body**: Generous padding (`18px 24px`), clean vertical rhythm, scrollable with custom slim scrollbar.
5. **Notice Banner**: For automated emails or security warnings, use a light blue banner (`bg: #EFF6FF`, `border: 1px solid #BFDBFE`, `border-radius: 10px`) with an accent icon and bold headline.
6. **Footer**: Pinned bottom bar (`background: #F8FAFC`, `border-top: 1px solid #E2E8F0`), right-aligned action buttons (`Cancel` + Primary action).

### D. Data Tables & Grids

1. **Header Row**: `#F8FAFC` background, `0.75rem` uppercase text in `#64748B`, tracking `0.05em`.
2. **Rows**: Clean white background, hover state `#F8FAFC` (`transition: background 0.12s ease`).
3. **Dividers**: Horizontal borders only (`1px solid #E2E8F0`). No vertical column borders except in spreadsheet modules.
4. **Action Column**: Dropdown context menu trigger (`MoreVertical`) or clear icon buttons.
5. **Empty States**: If a table has 0 rows, render an icon illustration, informative message, and a primary creation button. Never show empty gray space.

---

## 7. Responsive Breakpoint Standards

Every page must be designed with responsive fluid containers using the following standard breakpoints:

| Breakpoint | Range | Key Layout Adjustments |
| :--- | :--- | :--- |
| **Mobile (`sm`)** | `< 640px` | Single column grid, sidebar off-canvas drawer, horizontally scrollable tables, stacked modal footers |
| **Tablet (`md`)** | `640px` – `1024px` | 2-column stats grid, compact table columns, touch-friendly tap targets (>= 42px) |
| **Desktop (`lg`)** | `1024px` – `1440px` | Full multi-column grid, persistent sidebar, expanded tables with all columns visible |
| **Wide (`xl`)** | `> 1440px` | Max-width content constraint to maintain readability without stretched lines |

---

## 8. Preservation of Architecture & Logic

When implementing frontend enhancements or fixes:
1. **Never alter API routes**: Do not change URLs like `/api/admin/users`, `/api/login`, `/api/admin/projects`.
2. **Respect Axios Centralization**: Keep all requests routed through `API_BASE` or the centralized interceptor in `src/main.jsx`.
3. **Retain State & Validation**: Preserve existing form validations (e.g. `validateFullName`, `validatePhone`, `validateEmail`) and role checks.
4. **Maintain Component Contracts**: Do not break existing props on shared components like `AdminSidebar`, `RoleSidebar`, `CustomSelect`.

---

## 9. Quality Checklist for Frontend Changes

Before considering any frontend UI task complete, verify:
- [ ] Are all colors aligned with the Blue & Navy palette (`#2563EB`, `#1E3A8A`, `#F1F5F9`, `#FFFFFF`)?
- [ ] Are input borders crisp, single-lined, and without double-ring glitches?
- [ ] Does the page look clean and balanced on desktop, tablet, and mobile viewport widths?
- [ ] Does the sidebar expand, collapse, and slide out correctly without content overflow?
- [ ] Are loading and empty states properly handled?
- [ ] Does `npm run build` inside `ticket-frontend` succeed with 0 compilation errors?

