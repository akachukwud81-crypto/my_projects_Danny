export const buildPrompt = `# Development Prompt — Standalone Habit Tracker

## 1. Product goal
Build a fully functional, premium habit-tracking productivity dashboard. The final deliverable must be a complete standalone web app that works by opening index.html in a modern browser. It must require no installation, server, account, network connection, or additional setup.

## 2. Exact technology constraints
- Use only HTML5, CSS3, and vanilla JavaScript (ES6+).
- No frameworks: no React, Vue, Angular, Svelte, jQuery, or equivalents.
- No libraries: no component, chart, date, animation, icon, or utility packages.
- No backend, database, authentication service, cloud API, or analytics service.
- No build tools, package manager, bundler, transpiler, or development server.
- Do not add package.json or dependencies.
- Use native browser APIs and handwritten SVG/CSS when visualizations or icons are needed.
- JavaScript must use native ES modules. Because some browsers restrict module imports under file://, provide a graceful fallback note and ensure the production folder can also run from any static host without modification. If strict open-by-double-click support is required in all target browsers, use ordered defer scripts that expose one frozen App namespace rather than imports.

## 3. Exact project structure
habit-tracker/
├── index.html
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── layout.css
│   ├── components.css
│   ├── responsive.css
│   └── print.css
├── js/
│   ├── app.js              # bootstrap and event orchestration
│   ├── state.js            # single source of truth and subscriptions
│   ├── storage.js          # localStorage, validation, migration, import/export
│   ├── ui.js               # DOM rendering and accessible UI updates
│   ├── habits.js           # CRUD, completion, frequency, streak logic
│   ├── statistics.js       # daily/weekly/monthly aggregation
│   ├── calendar.js         # calendar generation and date navigation
│   └── utils.js            # dates, IDs, sanitization, formatting, debounce
├── assets/
│   └── favicon.svg
└── README.md

## 4. Semantic HTML foundation
1. Create a skip link targeting main content.
2. Use a header for mobile branding/actions, an aside containing a nav for desktop navigation, and main with labelled sections for Dashboard, Habits, History, Statistics, and Settings.
3. Use real buttons for actions and anchors only for navigation. Every icon-only button needs an aria-label and visible focus style.
4. Build the habit editor with a labelled form, fieldset/legend groups, native inputs/selects, inline errors connected with aria-describedby, and Cancel/Save actions.
5. Add a native dialog when supported, with a progressively enhanced div[role=dialog] fallback. Trap focus, restore focus on close, close on Escape, and prevent background scrolling.
6. Include aria-live regions for toasts and save/error announcements.

## 5. Data model and state
Use a versioned state object:
{
  version: 1,
  preferences: { theme: "system|light|dark", reducedMotion: false, weekStartsOn: 1 },
  habits: [{
    id, name, description, category, color, icon,
    frequency: { type: "daily|weekly|monthly", target: Number, weekdays: [] },
    reminderTime, createdAt, archivedAt,
    completions: ["YYYY-MM-DD"]
  }]
}
Keep state private inside state.js. Expose getState(), subscribe(), and named action functions; do not let rendering code mutate objects directly. Use immutable updates and render after each successful action.

## 6. Persistence, import, and export
1. Save to localStorage under a namespaced, versioned key after every mutation; debounce noncritical preference writes.
2. Wrap every read/write/parse operation in try/catch. If storage is unavailable, keep the in-memory app usable and show a nonblocking warning.
3. Validate loaded data, reject prototype-polluting keys, normalize dates, clamp numeric goals, and migrate older versions before use.
4. Export a timestamped UTF-8 JSON Blob using URL.createObjectURL, then revoke the URL.
5. Import through an accept=.json file input. Read with FileReader, enforce a sensible file-size limit, parse safely, validate shape/version, show a preview/confirmation, and never overwrite current data until validation succeeds.
6. Add a destructive Reset Data action with an explicit confirmation dialog.

## 7. Core habit functionality
- Create a habit with name, optional description, category, accent color, icon, period, target, selected weekdays, and optional reminder time.
- Edit every field without losing completion history.
- Delete with confirmation and offer an Undo toast before permanent removal.
- Toggle completion for today and past calendar dates; prevent future completions.
- Prevent duplicate completion dates.
- Filter by category/status and sort by manual order, name, streak, or newest.
- Support daily, N-times-per-week, and N-times-per-month goals.
- Show useful empty states for first use and zero filter results.

## 8. Business logic
- Daily progress: completed active habits / active habits due today.
- Weekly progress: completions in the configured week divided by summed weekly targets, capped visually at 100% while preserving raw counts.
- Monthly progress: same rule for the selected calendar month.
- Current daily streak: count consecutive qualifying days backward from today; if today is incomplete, begin at yesterday so an in-progress day does not erase the streak.
- For weekly/monthly habits, define a streak as consecutive completed periods where count >= target. Label it “week streak” or “month streak” rather than implying days.
- Longest streak: walk sorted completion dates/periods once, resetting on each gap.
- Statistics: total check-ins, completion rate, best streak, most consistent habit, current-week comparison, category distribution, and 7/30/90-day trends.
- Centralize all local date calculations in utils.js. Store YYYY-MM-DD local date keys to avoid UTC rollover bugs.

## 9. Visual direction
Create a premium, minimal productivity dashboard with a warm off-white canvas, white elevated surfaces, deep ink text, muted gray secondary text, one violet primary accent, and restrained coral/green/gold category accents. Dark mode should use charcoal/navy surfaces rather than pure black. Use a system font stack; typography should feel editorial through size, weight, tracking, and whitespace.

Desktop layout:
- 240–260px fixed sidebar with product mark, primary nav, category shortcuts, and a compact weekly-goal card.
- Fluid main column with a max readable width, generous 28–36px gutters, page greeting, date rail, metric cards, habit list, and insights panel.
- Cards use 16–22px radii, 1px low-contrast borders, and very soft shadows. Avoid excessive gradients.

Habit cards:
- Left: colored 42px icon tile, habit name, category/frequency, reminder.
- Center: seven compact day cells with weekday initial and check state. Completed cells use the habit color, a checkmark, and sufficient contrast. Today has a clear ring; future dates are disabled.
- Right: handwritten SVG progress ring or CSS conic-gradient ring with text fallback, current streak, and an accessible overflow menu.
- On mobile, stack metadata above the seven-day row and keep the complete action at least 44×44px.

Progress bars:
- Rounded track, 8–10px high, subtle neutral background, animated fill driven by a CSS custom property.
- Always pair color with text (for example “4 of 5 · 80%”). Set role=progressbar with aria-valuemin, aria-valuemax, and aria-valuenow.
- Respect prefers-reduced-motion and avoid animating from zero on every render.

Calendar:
- Build month grids with CSS Grid and native Date methods. Include previous/next month controls, a Today button, weekday headers, leading/trailing blank cells, and an accessible selected-date state.
- Use dots/bars for completion density, not color alone. Future dates are disabled. Add a list summary for screen readers.
- On narrow screens use a horizontal seven-day rail for the dashboard and the full month grid in History.

Statistics:
- Four compact KPI cards for today rate, weekly rate, current/best streak, and total check-ins.
- Draw bar/line/donut charts with semantic HTML, CSS, or inline SVG only. Include a text/table equivalent or aria-label for every chart.
- Use subtle grid lines, rounded bar caps, sparse labels, and tooltips implemented with focusable buttons so keyboard users receive the same values.

## 10. Interaction and feedback
- Add a theme control with system/light/dark options; set color-scheme and persist preference.
- Toasts appear in an aria-live region, auto-dismiss after 4–6 seconds, pause on hover/focus, and provide a close button. Undo is available for deletion.
- Add hover lift of no more than 2px, pressed states, menu/dialog easing, checkmark draw, progress-fill transitions, and skeleton-free immediate local rendering.
- Use event delegation for repeated habit/calendar controls. Confirm destructive actions.
- Mobile navigation becomes a reachable bottom tab bar; avoid hiding essential actions behind hover.

## 11. Error handling and security
- Display specific, human-readable messages for validation, storage quota, malformed imports, unsupported files, and unexpected rendering failures.
- Never inject user content with innerHTML. Build nodes with createElement and assign textContent.
- Sanitize/normalize every imported string, cap lengths, generate IDs with crypto.randomUUID() plus a fallback, and avoid eval/new Function.
- Add a top-level error boundary pattern with window.onerror and unhandledrejection that logs technical detail and displays a recoverable message without deleting data.

## 12. Accessibility requirements
- Meet WCAG 2.2 AA contrast, keyboard operation, logical heading order, landmarks, labels, error identification, 44px touch targets, and 200% zoom/reflow.
- Make focus-visible styling highly obvious and never remove outlines without replacement.
- Set aria-current for navigation, aria-pressed for toggles, aria-expanded/controls for menus, and role=status for nonurgent updates.
- Test with keyboard only, screen-reader landmark navigation, forced-colors mode, dark mode, and prefers-reduced-motion.

## 13. Responsive requirements
- 1200px+: sidebar plus spacious two-column dashboard.
- 768–1199px: compact sidebar or top nav, one-column content where needed.
- Below 768px: bottom navigation, edge-to-edge cards with smaller radii, horizontally scrollable date rail, sticky Add button, no horizontal page overflow.
- Test at 320, 375, 768, 1024, and 1440px, in portrait and landscape.

## 14. Phased development plan
Phase 1 — Foundation: create the exact folders/files, tokens, reset, semantic landmarks, skip link, responsive shell, sample static cards, and favicon.
Phase 2 — State/storage: implement the versioned model, reducer-like actions, subscriptions, validation, migrations, seeded demo state, localStorage resilience, and tests through a small in-browser test harness.
Phase 3 — Core CRUD: implement create/edit/delete, form validation, accessible dialog behavior, filters, sort, completion toggles, and empty states.
Phase 4 — Logic: implement date utilities, due-date rules, daily/weekly/monthly progress, current/longest streaks, selected-date behavior, and boundary tests for month/year/leap-day transitions.
Phase 5 — Calendar/statistics: render seven-day and monthly calendars, metric cards, SVG/CSS charts, chart text equivalents, and date-range controls.
Phase 6 — Data controls: add safe export, validated import preview/confirmation, reset, storage-error recovery, and version migration.
Phase 7 — UX polish: add dark mode, toasts with undo, menus, transitions, mobile navigation, empty/error states, and reduced-motion behavior.
Phase 8 — Accessibility/responsiveness: audit keyboard order, focus trapping/restoration, ARIA states, contrast, touch sizes, zoom, screen-reader output, and all breakpoints.
Phase 9 — Final QA: manually test every CRUD path; completion toggles; reload persistence; corrupt storage; import/export round trip; quota/private mode; future dates; timezone rollover; all filters; theme persistence; no-console-error requirement; and cross-browser use in current Chrome, Firefox, Safari, and Edge.

## 15. Acceptance checklist
The submission is complete only when all CRUD actions work, completion/progress/streak calculations are correct, localStorage survives reload, import/export round trips without data loss, dark mode persists, every interactive control is keyboard accessible, all views work from 320px upward, no external request/dependency occurs, and no console errors remain.

## 16. Final deliverable
Return the entire habit-tracker folder with every listed file fully implemented—no placeholders, TODO comments, omitted sections, minified source, or pseudo-code. Include a README that documents features, data format, keyboard behavior, browser support, and manual QA results. The app must be usable offline and must run by opening index.html in a modern browser with no install command, no build step, and no additional setup.`
