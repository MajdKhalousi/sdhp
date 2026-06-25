# Git Workflow

**Last updated:** Phase 0B
**Source:** observed conventions in this repository's actual git history — not invented

## Purpose

Documents the git conventions already in consistent use in this repository, so they stay consistent going forward instead of drifting per-contributor.

## Branch

Single primary branch: **`master`**. Work observed in this repository's history happens directly on `master` via sequential commits, not long-lived feature branches.

## Commit Message Convention

Format: `Phase <number><optional letter/suffix> — <short description>`

Examples observed directly in `git log`:
```
Phase 157B — Documentation accuracy pass (Payroll, Phase 154B/155/156 status)
Phase 156C — Offsite backup sync script + runbook (repo-only, not yet scheduled)
Phase 154B — Invoice role scoping for DOCTOR/NURSE + billing report count fix
Phase 150B-3A — Add page-level role guards to 5 unguarded detail/action pages
```

- The phase number/letter ties the commit back to the phase that produced it — useful for tracing *why* a change was made, not just *what* changed.
- The short description after the dash states the change itself, in active voice.
- A longer body explaining *why* (not just *what*) is common for substantive changes — see the commits above for examples.
- Commits authored with AI assistance include a trailing `Co-Authored-By:` line.

## Commit Practices

- **Prefer new commits over amending.** Amending rewrites history; a new commit is always safer unless explicitly intended otherwise.
- **Never force-push** without explicit, scoped approval.
- **Never skip hooks** (`--no-verify`) or bypass signing.
- **Scope commits to one logical change.** When an unrelated change is sitting in the working tree (e.g., a stray `.gitignore` edit from an earlier phase), it gets its own commit rather than being bundled in — keeps history traceable to a single phase per commit.
- **Stage specific files**, not `git add -A`/`git add .`, to avoid accidentally committing credentials, local env files, or unrelated work-in-progress.

## What Should Never Be Committed

Enforced via `.gitignore`: `.env*` files (except explicit `.example` templates), local demo-credential handoff files, certificates/keys, Docker volumes, generated Prisma client code, coverage reports, and ad-hoc local QA/verification scripts.

## Related

- [Phase-Process.md](Phase-Process.md)
- [../00-Company/Decisions/Decision-006-Development-Workflow.md](../00-Company/Decisions/Decision-006-Development-Workflow.md)
