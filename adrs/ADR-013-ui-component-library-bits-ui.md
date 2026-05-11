# ADR-013: UI component library — bits-ui

## Status

**Proposed**

## Date

2026-05-11

## Scope

- **In scope:** Choice and use of **bits-ui** as the primary **headless** UI primitive layer for components under `src/lib/ui/`. Applies when adding or changing components in that tree and a third-party primitive would reduce bespoke accessibility and interaction behavior. Agent and contributor defaults for imports and documentation fetches when implementing bits-ui.
- **Out of scope:** Visual design system tokens, Tailwind layout conventions, and Flowbite or other **presentational** wrappers (see root [README](../README.md) stack summary); **route-level** and **page** composition outside `$lib/ui/` except where those surfaces reuse `$lib/ui` exports; domain data contracts ([ADR-008](ADR-008-schema-led-domain-contracts.md)); serverless and secret boundaries ([ADR-006](ADR-006-serverless-and-secret-boundary.md)). This ADR does **not** require bits-ui on every line of `$lib/ui/` — plain Svelte and semantic HTML remain valid when no primitive fits.

## Context

What's For Dinner already depends on **bits-ui** (see root `package.json`) as an accessible, unstyled primitive layer aligned with Svelte 5. The [UI README](../src/lib/ui/README.md) describes the local component library, but without an ADR, contributors might mix ad hoc patterns, duplicate focus and keyboard behavior, or add overlapping headless libraries. A single primary library keeps imports predictable and aligns [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) and [`.cursor/rules/bits-ui-documentation.mdc`](../.cursor/rules/bits-ui-documentation.mdc) with a binding architectural record.

### Decision pressure (required)

Interactive widgets (dialogs, menus, listbox/combobox, tabs, accordions) need consistent **ARIA**, **focus**, and **keyboard** behavior. Reimplementing that by hand is error-prone and drifts from offline-first expectations for **clear, usable UI** ([ADR-001](ADR-001-product-operating-model.md)). The stack choice is already made in dependencies; the gap is a **normative** record so review and agents treat bits-ui as the default headless layer under `src/lib/ui/`.

### Supporting context

- **Problem:** Without a named standard, new work might introduce a second headless toolkit or one-off copies of complex interaction patterns.
- **Options at a high level:** (1) Standardize on bits-ui — **chosen**. (2) Add another headless library — rejected (split patterns, larger surface area). (3) No shared primitive layer — rejected (accessibility and maintenance cost).
- **Must stay true:** Product capability matrix and non-blocking local use ([ADR-001](ADR-001-product-operating-model.md)); optional cloud and auth do not change the need for solid client UI ([ADR-004](ADR-004-account-and-cloud-enhancement-model.md)).

## Decision

1. **bits-ui** is the **primary** headless UI component library for **What's For Dinner**. When adding or evolving UI under `src/lib/ui/`, use bits-ui as the **base layer** for interactive primitives (for example dialogs, menus, listbox/combobox patterns, tabs, accordions) **when a suitable bits-ui primitive exists** and the component needs that behavior.
2. Compose **project-specific** presentation and layout in Svelte and Tailwind around those primitives per [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc) and [`src/lib/ui/README.md`](../src/lib/ui/README.md).
3. If **no** bits-ui primitive matches the need, use **semantic HTML** and native elements, or **minimal custom Svelte** — do **not** introduce a second headless component framework for the same role without a **new ADR**.
4. **Documentation fetches for agents:** When implementing or debugging bits-ui under `src/lib/ui/`, official reference may be loaded from the LLM-oriented index at [https://bits-ui.com/llms.txt](https://bits-ui.com/llms.txt) and any `llms.txt` URL linked from that index. That permission is **scoped to bits-ui work** and is **not** blanket approval to browse unrelated sites (see [`.cursor/rules/bits-ui-documentation.mdc`](../.cursor/rules/bits-ui-documentation.mdc)).

### Explicit exclusions (required)

- **A second headless toolkit** (for example Melt UI alongside bits-ui for the same widget class) without a new ADR — out of scope; use bits-ui or plain markup until a follow-up ADR changes the boundary.
- **Replacing** accessibility or semantic-HTML expectations — bits-ui implements patterns; routes and pages must still meet the product’s accessibility discipline ([`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc)).
- **Styled all-in-one design systems** that own visuals end-to-end — rejected for **headless** layer selection; WFD keeps **unstyled primitives + project CSS** (see Alternatives below).

## Alternatives considered

### Melt UI or other Svelte headless libraries

Similar primitives, different APIs.

**Rejected because:** bits-ui is already adopted, documented for Svelte 5, and matches the unstyled-primitive role; a second library would split patterns and increase bundle and cognitive load.

### Only bespoke components with no shared primitive layer

Implement every interactive control from scratch in `$lib/ui/`.

**Rejected because:** Reimplementing focus management, keyboard roving, and ARIA wiring for complex widgets is error-prone and works against consistent accessibility.

### Styled component kits (pre-baked visual design systems)

**Rejected because:** WFD’s visual language is applied via Tailwind and local components; unstyled primitives preserve control and match the existing README stack choice.

## Consequences

### Positive

- One import surface and documentation set for headless widgets in `src/lib/ui/`.
- Accessibility behaviors (focus, keyboard, ARIA) centralized in maintained primitives.
- Agents and humans share the same default when scaffolding interactive components.

### Negative

- Contributors must learn bits-ui APIs for primitives they use; detailed docs live out-of-repo.
- Major bits-ui upgrades may require mechanical updates across composed components.
- “When applicable” still requires judgment — plain markup remains valid when simpler.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Primitive does not fit a new requirement | Propose a focused ADR (additional library or pattern) rather than silent one-off exceptions. |
| Doc drift vs installed bits-ui version | Prefer version-pinned package and release notes when upgrading; smoke-test composed components. |

## Operational impact

- **Developer workflow:** New interactive pieces under `src/lib/ui/` should start from bits-ui when a match exists; onboarding includes [bits-ui getting started](https://bits-ui.com/docs/getting-started) and [`src/lib/ui/README.md`](../src/lib/ui/README.md).
- **Build / bundle:** `bits-ui` is already a dependency; this ADR does not by itself change bundle strategy.
- **Debugging:** Use browser a11y tools and bits-ui docs; agent fetches are limited to the approved `llms.txt` graph per **Decision** point 4.

## Examples (optional)

- Composed controls in `src/lib/ui/` (for example tooltip, button) reference bits-ui component `llms.txt` URLs from the project UI README.

## Compliance (optional)

- **Standards:** Aim for accessible interactive behavior consistent with WCAG-oriented expectations; bits-ui primitives are a means to that end, not a substitute for page-level semantics and testing.

## Notes (optional)

- Package: `bits-ui` (root `package.json`). Flowbite Svelte and Carbon Icons are separate stack choices; they do not change the **headless primitive** default under this ADR.

## Enforcement rules

- **Cursor / agent rules:** [`.cursor/rules/bits-ui-documentation.mdc`](../.cursor/rules/bits-ui-documentation.mdc), [`.cursor/rules/svelte-5-ui-conventions.mdc`](../.cursor/rules/svelte-5-ui-conventions.mdc); rule catalog [`.cursor/rules/index.md`](../.cursor/rules/index.md).
- **Code / architecture:** New or substantially revised **complex interactive** components under `src/lib/ui/` should prefer bits-ui primitives before adding another headless dependency or hand-rolling the same behavior.
- **When to revisit:** Need for a second headless toolkit, breaking major-version constraints, or a strategic move away from bits-ui — supersede via a new ADR and update the index.

## Supersession notes

- **When to supersede:** Open a **new** ADR if the **core** choice of primary headless library changes.
- **Stable identifiers:** This file remains `ADR-013-ui-component-library-bits-ui.md`.
- **If superseded:** Link the successor ADR and summarize migration expectations for `$lib/ui/`.

---

## Orchestrated development

Orchestration not required.
