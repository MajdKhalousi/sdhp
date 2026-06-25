# Phase Process

**Last updated:** Phase 0B
**Source:** [../00-Company/Decisions/Decision-006-Development-Workflow.md](../00-Company/Decisions/Decision-006-Development-Workflow.md)

## Purpose

Practical detail on how a development phase should actually run, step by step.

## The Sequence

| Step | What it means in practice |
|---|---|
| **1. Idea** | A specific problem or opportunity is named — not yet a plan. |
| **2. Business Value** | Why this matters to the clinic/business is stated explicitly. If this step produces nothing convincing, the idea likely doesn't deserve a phase yet. |
| **3. Product Review** | Does this fit current scope? Check against [../00-Company/Product-Scope.md](../00-Company/Product-Scope.md) before going further. |
| **4. Architecture Review** | Does this fit the existing system shape, or does it require a deliberate architectural decision first? |
| **5. Technical Plan** | A concrete plan: files affected, approach, test plan, rollback consideration. Planning-only — no code yet. |
| **6. Implementation** | The actual code change, scoped to what the plan described. |
| **7. Code Review** | Independent check for correctness, simplicity, and fit with existing patterns. |
| **8. QA** | Verify the change actually works by running it, not just by reading the diff. |
| **9. Production** | Deploy, with explicit verification afterward — never assume a deploy worked without checking. |
| **10. Documentation** | Update the relevant EHOS docs (product inventory, architecture, scope) to reflect what's now true. |
| **11. Close Phase** | Explicit close — a phase isn't "done" until this happens, even if the code shipped. |

## Why Each Step Exists

Skipping straight from Idea to Implementation is how features get built that don't map to real value (no Business Value check), don't fit the system (no Architecture Review), or quietly drift the product's scope (no Product Review). The Documentation and Close Phase steps exist because — as Phase 157A demonstrated directly — documentation that isn't a deliberate step gets stale without anyone noticing.

## Related

- [../00-Company/Decisions/Decision-006-Development-Workflow.md](../00-Company/Decisions/Decision-006-Development-Workflow.md)
- [Git-Workflow.md](Git-Workflow.md)
