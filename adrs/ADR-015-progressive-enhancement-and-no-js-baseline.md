# ADR-015: JavaScript runtime, Dexie, and progressive enhancement

## Status

**Accepted**

## Date

2026-05-11

## Scope

- **In scope:** When **client JavaScript** is an **architectural requirement** vs an **optional enhancement**; explicit relationship to **Dexie / IndexedDB** ([ADR-002](ADR-002-local-data-ownership.md)); how **progressive enhancement** still applies to **navigation, forms, and document shape** without implying a no-JS local recipe book; constraints (performance, accessibility, offline) on **how** JS is used. Complements [ADR-014](ADR-014-semantic-html-and-accessibility.md).
- **Out of scope:** Detailed **service worker** and Cache Storage policy ([ADR-010](ADR-010-offline-cache-and-service-worker.md)); full **capability matrix** per feature ([ADR-001](ADR-001-product-operating-model.md)); **secrets and server-only** boundaries ([ADR-006](ADR-006-serverless-and-secret-boundary.md)).

## Context

What’s For Dinner is a **SvelteKit** app with a **local-first** recipe book. **Dexie** is **critical** today: it is the client-side access layer to **IndexedDB** for durable domains in [ADR-002](ADR-002-local-data-ownership.md). **Dexie requires a JavaScript runtime** in the browser—it does not execute in HTML-only or no-script environments.

Removing Dexie solely to satisfy a **strict no-JavaScript product** would imply a **bespoke IndexedDB** (or equivalent) client stack and a different data and routing story. That is **not in immediate or proposed plans**; it is **not ruled out** as a possible long-term direction if requirements change.

The team wants **no confusion**: this is a **JavaScript-reliant** application for local data and many interactions. **JavaScript should be allowed** wherever it advances the product and is **not detrimental** to **performance**, **accessibility**, or **offline / local-first** behavior. The decision is how to combine that honesty with **progressive enhancement** where the web platform still helps (links, forms, meaningful SSR).

### Decision pressure (required)

Without this record, “no-JS” guidance can be read as **mandating removal or avoidance of Dexie**, or as conflicting with [ADR-002](ADR-002-local-data-ownership.md). Contributors need a single place that states **JS + Dexie as normative** while still encouraging **semantic HTML and resilient shell patterns** from [ADR-014](ADR-014-semantic-html-and-accessibility.md).

### Supporting context

- **Serverless / SSR:** SvelteKit can still ship **meaningful HTML** for shells, auth, and static content; hydration and client stores **layer on** that foundation.
- **Offline:** Offline usefulness depends on **cached shell**, **Dexie**, and worker policy together ([ADR-001](ADR-001-product-operating-model.md), [ADR-010](ADR-010-offline-cache-and-service-worker.md))—not on pretending recipes exist in SSR HTML without JS.
- **Accessibility:** Client-heavy UI must still meet [ADR-014](ADR-014-semantic-html-and-accessibility.md); “more JS” is not an excuse to drop keyboard support, focus management, or native semantics where they apply.

## Decision

1. **Formal client JavaScript requirement (local data):** The **local recipe book** and other **Dexie-backed** durable data in the sense of [ADR-002](ADR-002-local-data-ownership.md) **require a running JavaScript runtime** in the browser. **Dexie does not operate without JavaScript.** Features that read or write that data **may** be implemented entirely on the client when that matches the architecture; they **must not** be described as if they worked without JS unless an alternative path exists.
2. **JavaScript is allowed by default:** Use client JavaScript **whenever it is appropriate for the product**, subject only to this ADR and to **not** harming:
   - **Performance** (avoid unnecessary main-thread work, huge bundles without cause, pathological re-render patterns),
   - **Accessibility** ([ADR-014](ADR-014-semantic-html-and-accessibility.md)),
   - **Offline and local-first capability** ([ADR-001](ADR-001-product-operating-model.md), [ADR-010](ADR-010-offline-cache-and-service-worker.md)).  
   There is **no** principle of minimizing JS for its own sake in a **JS-reliant** app.
3. **Progressive enhancement (without denying Dexie):** Prefer **real `href` navigation**, **native `form` / SvelteKit actions**, and **semantic controls** for flows where they improve **resilience, accessibility, and clarity**—especially **auth**, **primary shell navigation**, and any surface that can degrade gracefully when hydration is delayed. This **does not** require that **Dexie-backed lists or editors** function without JS; it **does** require not replacing links with **click-only non-semantic** patterns **where** a normal anchor or button would serve the same **navigation or submit** role.
4. **Dexie and alternatives:** Staying on **Dexie** is the **planned** approach. A future **non-Dexie** IndexedDB or storage layer remains possible but needs its **own ADR** if it changes the system-of-record story; it is **out of scope** here except to note that **no-JS-only local persistence** is not the current direction.
5. **Honest degradation:** When scripts are disabled, fail to load, or error before stores initialize, the UI **should** communicate that **local features need JavaScript** (and, where relevant, IndexedDB)—not infinite spinners or silent empty states that imply SSR will populate recipe data (see [docs/readme-adr-alignment-gaps.md](../docs/readme-adr-alignment-gaps.md) **GAP-020** and related items).

## Explicit exclusions

- **Guaranteeing** no-JS parity for every roadmap feature ([ADR-012](ADR-012-feature-roadmap-boundaries.md)) — excluded; feature envelopes may state JS + Dexie expectations explicitly.
- **Replacing** [ADR-006](ADR-006-serverless-and-secret-boundary.md) server-only or secret-handling rules — excluded.
- **Mandatory migration** off Dexie for progressive-enhancement reasons alone — excluded until a deliberate architectural ADR says otherwise.

## Alternatives considered

### House “JS required for local data” only in ADR-002 / ADR-001

**Deferred:** ADR-002 already names Dexie as SoT; this ADR adds **platform and UX framing** (SSR vs client, confusion avoidance, PE bias) in one place. If duplication becomes noisy, fold a short summary into ADR-001/002 and **supersede** this ADR with a clear successor link.

### Require a no-JS-readable local recipe book

**Rejected:** Would conflict with **Dexie** as the chosen access layer and with current delivery plans; could only be met with a **different persistence and rendering architecture** (not planned).

## Consequences

### Positive

- Clear answer: **JS + Dexie are expected** for local recipe data; no implied obligation to remove Dexie for PE reasons alone.
- Still nudges **links, forms, and semantics** where they help **accessibility and resilience** without fighting ADR-002.

### Negative

- “Progressive enhancement” in marketing language must be **careful**: it applies to **document and shell patterns**, not to **IndexedDB recipe bodies** without JS.

### Risks and mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Teams read only the title and assume “no rules” | Point to **Decision 2–3** and [ADR-014](ADR-014-semantic-html-and-accessibility.md). |
| Spinners with no copy when JS is off | Track and fix under **readme-adr-alignment-gaps** (e.g. GAP-020). |

## Operational impact

- Manual checks: **first HTML** for **shell navigation** and **auth** when those areas change; separate checks for **Dexie** flows in browser with JS enabled.
- Feature specs should say explicitly when a flow is **JS + Dexie required**.

## Enforcement rules

- **When to revisit:** Change to default local storage technology, major shift in offline model, or merge of this content into ADR-001/002.

## Supersession notes

- **Stable file name:** `ADR-015-progressive-enhancement-and-no-js-baseline.md` is retained for links; the **title** reflects the current decision focus.
- If superseded, link the replacement and state whether **Dexie** assumption changed.

---

## Orchestrated development

Orchestration not required for authoring this ADR alone.
