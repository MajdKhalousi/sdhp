# Decision 006 — Development Workflow

**Status:** Approved
**Last updated:** Phase 0B

## Purpose

Defines the standard sequence every development phase should follow, so phases are consistent and nothing important gets skipped under time pressure.

## Decision

Every phase must follow this sequence:

**Idea → Business Value → Product Review → Architecture Review → Technical Plan → Implementation → Code Review → QA → Production → Documentation → Close Phase**

Full practical detail on what each step means and looks like: [../../03-Engineering/Phase-Process.md](../../03-Engineering/Phase-Process.md).

## Why This Matters

Skipping straight from "idea" to "implementation" is how scope drifts and how features get built that don't map to real business value or fit the existing architecture. Naming each step explicitly — including a documentation step and an explicit phase-close — keeps phases finishable and traceable, consistent with [Decision-004](Decision-004-Core-Principles.md)'s "Business-Ready Product" principle.

## Related

- [../../03-Engineering/Phase-Process.md](../../03-Engineering/Phase-Process.md)
- [Decision-004-Core-Principles.md](Decision-004-Core-Principles.md)
