# ADR-015: Progressive enhancement and no-JavaScript baseline

## Status

**Proposed**

## Date

2026-05-11

## Scope

- **In scope:** What the product **expects** when JavaScript is unavailable, failing, or not yet executed; how that relates to SvelteKit **SSR** and **hydration**; and how **core** capabilities stay reachable without client JS **where the web platform allows**. Complements [ADR-014](ADR-014-semantic-html-and-accessibility.md) (semantic HTML and accessibility).
- **Out of scope:** Full **PWA offline** document caching ([ADR-010](ADR-010-offline-cache-and-service-worker.md)) as the detailed cache policy; **capability matrix** enumerating every feature ([ADR-001](ADR-001-product-operating-model.md)); **Dexie**-only behaviors that inherently require a JS runtime on the client.

## Context

WFD is implemented as a **SvelteKit** application. Much of the recipe experience is **enhanced** by client JavaScript (island of reactivity, Dexie, sync, AI calls). Users may disable scripts, block scripts, or load in environments where hydration is delayed or errors. **Accessibility is king:** core functionality must **not** be **gatekept** exclusively behind JavaScript when HTML and HTTP already allow a usable baseline.

### Decision pressure (required)

Without an explicit baseline, teams may ship **click-only** divs, omit `href`, or assume `onMount` always ran—blocking users who depend on real links, forms, or SSR output. That undermines [ADR-001](ADR-001-product-operating-model.md) (non-blocking, clear UI) and [ADR-014](ADR-014-semantic-html-and-accessibility.md) (native semantics first).

### Supporting context

- **SvelteKit:** Server rendering can deliver **HTML first**; progressive enhancement means that HTML should be **meaningful** for navigation and static content. Full SPA behavior after hydration is an enhancement.
- **Inevitable limits:** IndexedDB access, live sync, streaming AI, and many bits-ui interactions **require** a running client. The decision is **not** “everything works without JS”—it is “**core** user journeys are not **only** implemented in JS when the platform offers a link or document path.”
- **Relationship to ADR-014:** Real `href`s, semantic controls, and landmark structure support both accessibility and the no-JS baseline.

## Decision

1. **Principle — no exclusive gatekeeping:** Features that are **core** to using the local recipe book in the sense of [ADR-001](ADR-001-product-operating-model.md) (view and move between primary surfaces, consume SSR-provided content, submit straightforward forms) MUST NOT rely on client-only handlers **without** a real `href`, native form submission, or other **HTML-first** path that works for a full navigation or request. **Enhance** those paths with JS; do not **replace** them as the only option.
2. **Enhancements that require JS:** Cloud sync orchestration, conflict UI that depends on live stores, AI generation, Dexie-backed lists that never SSR, and complex widgets MAY require JS. They MUST **degrade** clearly (disabled controls, honest copy per [ADR-004](ADR-004-account-and-cloud-enhancement-model.md) and connectivity rules) rather than failing as a blank or inert surface with no explanation.
3. **Navigation:** Primary app routes SHOULD remain reachable via **anchor navigation** in SSR HTML where the layout renders links (see [ADR-014](ADR-014-semantic-html-and-accessibility.md) §2). Client-side routing may intercept **after** hydration; the document must not depend solely on `preventDefault` + router calls for the **first** paint of core destinations.
4. **Forms:** Prefer native **`form`** and **`action`** (or SvelteKit form patterns that work without client JS) for auth and other critical POST flows unless a documented exception exists; progressive enhancement is the default bias.
5. **When in doubt:** Prefer **more** usable HTML baseline over **fewer** bytes of JS-only UI for the same capability.

## Explicit exclusions

- **Guaranteeing** feature parity without JS for every future roadmap item ([ADR-012](ADR-012-feature-roadmap-boundaries.md)) — excluded; each feature envelope should state its JS requirement explicitly.
- **Replacing** security or server-only constraints from [ADR-006](ADR-006-serverless-and-secret-boundary.md) — secrets stay server-side regardless of baseline.

## Alternatives considered

### Require full application function without any JavaScript

**Rejected:** Dexie-backed recipe storage and many planned interactions are **client-native**; the cost of a 100% no-JS app would misrepresent the product architecture.

### Defer any baseline until a formal WCAG audit

**Rejected:** Baseline expectations are architectural and affect every PR; they can be decided without waiting for a full audit program.

## Consequences

### Positive

- Clear bar for “can this be a `div` with `on:click` only?” (usually no for core navigation).
- Aligns marketing “offline-first” narrative with **document** semantics, not only client stores.

### Negative

- Some UX will still **require** JS; copy and UI states must explain that honestly.
- Developers must test **at least occasionally** with scripts disabled or with “view source / first HTML” mindset for critical paths.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Ambiguity on “core” vs optional | Tie to ADR-001 matrix and feature docs; refine in PR review. |
| SvelteKit defaults encourage client-only patterns | Prefer documented Kit patterns that preserve progressive enhancement where feasible. |

## Operational impact

- Add no-JS or “first HTML” checks to manual test notes for auth and primary navigation when those areas change materially.

## Enforcement rules

- **When to revisit:** Major shell or router refactors, or material changes to ADR-001 capability matrix.

## Supersession notes

- If baseline rules merge into ADR-001 or a dedicated “platform UX” ADR, supersede this file with a clear successor link.

---

## Orchestrated development

Orchestration not required for authoring this ADR alone.
