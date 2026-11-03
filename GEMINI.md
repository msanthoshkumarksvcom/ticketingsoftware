# Project Workspace Rules: QA Software & Ticketing System

These instructions apply to all agent interactions across the entire project repository.

## Frontend UI & Design System Enforcement

Whenever performing **any** frontend development work—including:
- Creating new pages or views
- Modifying or refactoring existing pages
- Redesigning or updating dashboards (Admin, QA Lead, Developer, QA Member, Project Lead)
- Creating or editing UI components
- Modifying page layouts or sidebar navigation
- Styling forms, inputs, buttons, tables, cards, or modals
- Fixing frontend visual/CSS bugs or UI clumsiness
- Implementing or improving responsive design for mobile, tablet, and desktop

**You MUST activate and strictly adhere to the project skill:**
`frontend-ui-design-system` located at `.agent/skills/frontend-ui-design-system/SKILL.md`.

### Core Requirements for Frontend Work
1. **Color Palette**: Always use the defined Blue & Dark Navy color system:
   - **Primary**: `#2563EB` (Hover: `#1D4ED8`, Soft: `#EFF6FF`, Border: `#DBEAFE`)
   - **Dark Navy**: `#1E3A8A` (Text Primary / Header: `#0F172A`, Dark Accent: `#1E293B`)
   - **Background Canvas**: `#F1F5F9`
   - **Surface / Cards / Modals**: `#FFFFFF`
   - **Standard Border**: `#E2E8F0` / `#CBD5E1`
   - **Text**: Primary `#0F172A`, Secondary `#475569`, Muted `#64748B`, Placeholder `#94A3B8`
2. **Visual Cleanliness**: Use single, crisp 1.5px borders for form inputs with subtle focus rings. Eliminate double-border glitches, clutter, or misaligned elements.
3. **Modals & Dialogs**: Follow the balanced, rounded-18px modal layout with frosted backdrop blur, clear header, clean body spacing, and right-aligned action buttons in the footer.
4. **Responsive Layout**: Ensure desktop (`> 1024px`), tablet (`640px–1024px`), and mobile (`< 640px`) layouts are fully responsive. Maintain the 256px/76px desktop sidebar transition and off-canvas mobile slide-out drawer.
5. **Logic & API Preservation**: Never break backend API routes, authentication tokens, Axios interceptors in `src/main.jsx`, or existing form validation functions.
6. **Verification**: Always run `npm run build` in `ticket-frontend` to confirm zero compilation errors before completing a task.

