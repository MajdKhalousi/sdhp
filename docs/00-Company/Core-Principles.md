# Core Principles

**Last updated:** Phase 0B
**Source:** [Decision-004-Core-Principles.md](Decisions/Decision-004-Core-Principles.md)

## Purpose

These seven principles govern how Elaji Health is designed and built. When a product or engineering decision is ambiguous, these principles — not personal preference — should resolve it.

## The Principles

| # | Principle | What it means in practice |
|---|---|---|
| 1 | **Daily Clinic First** | Every feature is judged by whether it helps a real clinic run its actual day — reception, doctor, billing, reports — not by how impressive it looks in a demo. |
| 2 | **Patient-Centered Data** | The patient record is the center of gravity. Clinical, billing, and administrative data all relate back to a patient, not the other way around. |
| 3 | **Permission by Design** | Access control is a first-class design concern, not an afterthought bolted on later. Every role's access is deliberate and explainable. |
| 4 | **Auditability** | Significant actions — especially clinical and financial ones — leave a record of who did what and when. This matters for trust, incident investigation, and (eventually) compliance. |
| 5 | **Simple Before Powerful** | Prefer the simple, correct version of a feature over the powerful, complex one, until real usage proves the simple version isn't enough. |
| 6 | **Modular Architecture** | The system is built as composable modules (patients, billing, HR, etc.), not a monolith where everything is entangled with everything else — so parts can grow independently. |
| 7 | **Business-Ready Product** | The product is built to actually be sold and run for a real paying clinic, not as a perpetual prototype — see [Decision-002](Decisions/Decision-002-First-Business-Goal.md). |

## Related

- [Vision.md](Vision.md)
- [Product-Scope.md](Product-Scope.md)
- [../03-Engineering/Phase-Process.md](../03-Engineering/Phase-Process.md) — how these principles show up in the actual phase workflow
