# ADR-014: Semantic HTML and accessibility

> **Validity rule:** Any `{{ ... }}` placeholder remaining in this file renders the ADR invalid and it must not be treated as authoritative regardless of its stated status.

## Status

**Accepted**

## Date

2026-05-11

## Scope

- **In scope:** Semantic HTML, landmarks, heading hierarchy, ARIA discipline, keyboard and pointer accessibility, focus management for dynamic UI, motion preferences, and the relationship between presentation and accessibility across **Svelte** UI: `src/routes/**/*.svelte` (including `+layout.svelte`), and `src/lib/ui/**`. Interaction built with **bits-ui** per [ADR-013](ADR-013-ui-component-library-bits-ui.md).
- **Out of scope:** Visual design tokens, general Tailwind layout policy, Zod and API contracts ([ADR-008](ADR-008-schema-led-domain-contracts.md)), serverless and secrets ([ADR-006](ADR-006-serverless-and-secret-boundary.md)), **what** counts as “core” vs JavaScript-dependent capability (normative split lives in [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md) while Proposed).

## Context

What's For Dinner is a **SvelteKit** offline-first recipe application ([ADR-001](ADR-001-product-operating-model.md)). The UI combines **native HTML**, **Tailwind**, shared components under `$lib/ui`, and **bits-ui** primitives. Headless components may wrap or replace a raw `<button>` / listbox pattern, but the composed experience must remain **perceivable, operable, and understandable** for keyboard, screen reader, and voice users.

### Decision pressure (required)

Without a single accessibility ADR, agents and contributors may regress semantics (div-click handlers), skip heading order, or hide the only navigable path to a surface behind client-only behavior. That conflicts with the product expectation of **clear, non-blocking UI** and with the principle that **accessibility is not optional decoration**.

### Supporting context

- **Problem:** Accessibility rules were inherited from another product (fixed header/main/footer, command palette). WFD’s **shell markup evolves** with features; the ADR must encode **invariants**, not brittle copies of today’s DOM.
- **Progressive enhancement and no-JS:** SvelteKit and client-side stores mean not everything runs without JavaScript; still, **core user-facing flows must not be exclusively gated on JS** when the platform can offer links, forms, or SSR HTML. That split is recorded in [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md).
- **bits-ui:** [ADR-013](ADR-013-ui-component-library-bits-ui.md) names bits-ui as the primary headless layer; this ADR does **not** relax native-first semantics—primitives must be composed so the **result** is accessible.

## Decision

### 1 — Native semantics first; bits-ui must stay accessible

1. Prefer the **correct native HTML element** for the job (`a` with `href`, `button`, `label` + `input`, headings, lists).
2. Use **bits-ui** (or other ADR-approved primitives) when they implement a complex widget **and** the shipped markup/behavior meets the same bar: focus order, keyboard operation, visible or programmatic names, appropriate roles/states. If a primitive fights the wrong pattern, fix composition or choose a simpler native pattern.
3. **Order of preference:** native element → native attributes (`disabled`, `required`, `type`, etc.) → ARIA only where HTML cannot express the semantics. **Do not** use ARIA to patch wrong structure (for example `role="button"` on a `div` when `button` exists).

### 2 — Landmarks and shell shape (invariants, not a frozen DOM)

Markup **will** change as layouts and features ship. These invariants stay binding:

1. **Primary content:** The default app shell MUST expose exactly **one** primary content landmark—today `<main>` wrapping route content in root `+layout.svelte`. If a future layout replaces `<main>`, this ADR must be updated to name the replacement pattern; do not silently drop a primary landmark.
2. **Navigation:** Regions that navigate between app routes SHOULD use semantic structure (`nav` or components that expose equivalent landmark/role semantics). Destinations MUST use real **URLs** (`href`) for standard navigation—not JS-only “navigation” as the **sole** path to core destinations (see [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md)).
3. **Hiding and duplicate paths:** `display: none`, `visibility: hidden`, and `aria-hidden="true"` are **forbidden** when they remove the **only** reachable, equivalent path to an action or destination for the user’s mode (for example hiding all links while no other keyboard-accessible control offers those routes). They are **permitted** when content is genuinely inapplicable, or when an **equivalent** path exists and hiding avoids duplicate announcements or tab stops (document the equivalence in review when non-obvious).
4. **Visually hidden text:** When text must be available to assistive technologies but not shown visually, use the project’s established pattern (for example Tailwind **`sr-only`** on a `span`, as used in icon controls)—not `display: none`—unless tier (3) above applies.

### 3 — Heading hierarchy

Each distinct **page-level** view SHOULD own exactly one **`h1`** describing that view. Headings SHOULD descend in order (`h1` → `h2` → `h3`) without skipping levels for document structure. Do not pick a heading level for its default font size; use CSS for appearance.

### 4 — HTML as the semantic layer; CSS and JS as presentation and behavior

- Do not **omit** essential content or controls from the DOM purely for visual effect.
- Do not remove interactive elements from the DOM **only** for aesthetics when they remain the only way to perform a core action.
- Enhanced behavior (dialogs, sheets, client transitions) layers on top of a **meaningful** document; it does not replace the need for names, roles, and keyboard support on the composed tree.

### 5 — Keyboard and focus

Every interactive control MUST be **keyboard operable** (Tab order logical, `Enter`/`Space` on buttons/links per platform conventions, `Escape` closes overlays/dialogs where applicable, focus not stranded on `document.body` after dismiss). **Focus indicators:** do not remove focus outlines without a **visible** replacement; any exception needs explicit review and AT verification.

### 6 — Pointer, target size, and non-hover reliance

- Touch targets SHOULD meet **44×44px** minimum where feasible (WCAG 2.5.5 target size).
- No interaction **requires hover** as its only trigger.
- Visible text in controls SHOULD serve as the accessible name unless supplementary naming is genuinely needed (avoid redundant `aria-label` that fights visible text).

### 7 — Dynamic content and live regions

Dialogs, menus, and other overlays MUST manage **focus** (move into the surface on open, restore on close unless a better target is agreed). Use **`aria-live`** only for **meaningful** status updates the user needs without moving focus; avoid noisy regions.

### 8 — Motion

Animations and transitions MUST respect **`prefers-reduced-motion`**. Non-animated state MUST remain usable and understandable. Prefer wrapping motion in `@media (prefers-reduced-motion: no-preference)` (or equivalent checks in JS) so reduced-motion users get a static experience.

```css
/* Example pattern */
@media (prefers-reduced-motion: no-preference) {
	.animated-element {
		transition: opacity 200ms ease;
	}
}
```

## Explicit exclusions

- **Defining the full WCAG audit matrix** for every component — out of scope here; use this ADR plus product rules and testing practice.
- **Replacing** [ADR-013](ADR-013-ui-component-library-bits-ui.md) headless choice — bits-ui remains the governed primitive layer; this ADR governs **how** it is composed with HTML semantics.
- **`<noscript>`-only navigation:** Rejected (same rationale as before): navigation and core links belong in the real document for all modes; do not tuck the only link tree exclusively inside `<noscript>`.

## Alternatives considered

### Prescribe a fixed global `<header>`, `<main>`, `<footer>` on every page

**Rejected for WFD:** The current shell uses **sidebar + `<main>`** without a global document footer. Requiring three landmarks would be inaccurate and would fight future layouts. **Landmark invariants** (single primary content landmark, real links for core nav) are preserved instead.

### Broad ARIA for “richer” screen reader output

**Rejected:** Unnecessary ARIA overrides native semantics and often worsens AT behavior. Prefer correct HTML and minimal, justified ARIA.

## Consequences

### Positive

- One place that ties semantics, bits-ui composition, keyboard, and motion expectations to WFD.
- Shell markup can evolve without relitigating every accessibility principle—as long as invariants hold.

### Negative

- Contributors must think about **equivalent paths** when hiding or duplicating navigation.
- Overlays and client-heavy flows require explicit focus and AT checks.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Drift between ADR and actual layout | Update this ADR when changing primary landmarks; record stubborn gaps in [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md). |
| Over-reliance on JS for core flows | [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md) names baseline expectations; align new features with both ADRs. |

## Operational impact

- PR review for UI routes and `$lib/ui` should spot-check landmarks, headings, link-vs-button choice, and overlay focus.
- Prefer manual keyboard and screen reader smoke on navigation and primary dialogs when touching layout or shell.

## Compliance (optional)

- Aligns with **WCAG 2.1** intent (keyboard, names/roles, focus visible, target size, reduced motion) as engineering guidance; formal conformance claims remain out of scope unless separately owned.

## Enforcement rules

- **Code / architecture:** `src/routes/**/*.svelte`, `src/lib/ui/**` must conform to the **Decision** sections above.
- **Cursor / agent rules:** [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) must stay consistent with this ADR; update that file when guidance changes.
- **When to revisit:** New shell patterns (e.g. global footer, marketing pages), new overlay patterns, or a change to [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md) baseline.

## Supersession notes

- **When to supersede:** If semantic strategy fundamentally changes (e.g. different component library without a superseding ADR for headless layer).
- **If superseded:** Link the successor ADR and summarize migration for UI contributors.

---

## Orchestrated development

Orchestration not required for authoring this ADR; orchestration applies per [GOVERNANCE.md](GOVERNANCE.md) section 10 when implementation work is multi-phase or high-risk.

## Agent directives (summary)

- Prefer **native elements**; use bits-ui when it fits and **verify** keyboard and names on the composed control.
- Keep **one `<main>`** (or ADR-documented successor) for primary content; do not drop primary landmarks without updating this ADR.
- Use **`href`** for route navigation; do not make core destinations **JS-only** as the only path (see [ADR-015](ADR-015-progressive-enhancement-and-no-js-baseline.md)).
- Preserve **heading order**; style with CSS, not wrong levels.
- Do not hide the **only** path to an action with `display: none` / `aria-hidden` without an equivalent path.
- Wrap **motion** in `prefers-reduced-motion` preference.
- On **overlay open/close**, manage focus intentionally.
