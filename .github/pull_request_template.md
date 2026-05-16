## Summary

Describe the change in three buckets (write **None** when a bucket does not apply).

### Product / UX

<!-- User-visible behavior, copy, loading/offline states, a11y users would notice -->

### Architecture / ADR

<!-- ADR links, data/auth/sync/AI/offline boundaries; or None -->

### Alignment gaps

<!-- New/updated GAP-* in docs/readme-adr-alignment-gaps.md; or None -->

## Test evidence

<!-- Required: commands run, spec paths, or manual steps -->

- **Commands run:**
- **Coverage notes:**
- **Untested risk:** <!-- Required if nothing was run; state what could break -->

## Merge-ready (architecture-touching changes only)

<!-- Delete this section for trivial / non-architectural PRs; state "Orchestration not required" when applicable -->

- [ ] ADR created/updated or documented follow-up ([MG-02](docs/validation-checklist.md#merge-ready-gates))
- [ ] Alignment gaps updated if deviating from Accepted ADRs ([MG-01](docs/readme-adr-alignment-gaps.md))
- [ ] `pnpm run check` and `pnpm run lint` pass for touched paths ([MG-05](docs/validation-checklist.md#merge-ready-gates))
- [ ] Orchestrated run: linked `validation-report.md` + `test-report.md` with **PASS** / **PASS_WITH_NOTES**

**Guide:** [docs/pr-and-commit-guide.md](docs/pr-and-commit-guide.md) · **Gates:** [.cursor/rules/workflow-gates.mdc](.cursor/rules/workflow-gates.mdc)
