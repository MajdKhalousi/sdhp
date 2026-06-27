# Operating Model — Human/AI Collaboration

**Last updated:** Phase 0E-C27-A
**Source:** [Phase-Process.md](Phase-Process.md), [Git-Workflow.md](Git-Workflow.md), and the actual phase-by-phase pattern observed across this project's EHOS/staging/production-readiness work — not invented.

## Purpose

The detailed, company-style operating model for how the user, ChatGPT, and Claude work together on this project. [PROJECT_BRAIN.md](../PROJECT_BRAIN.md) is the compact front door; this file is where the full reasoning and templates live.

## Roles and Responsibilities

### Owner / Product Manager / Operator (User)
Decides scope and priority, approves or rejects plans before any implementation, reviews and approves diffs before any commit, approves pushes and deploys, runs all server-side commands personally (or explicitly authorizes another human to), and is the only party who can classify ambiguous data (e.g., "is this organization real or internal test data") — that judgment is never delegated to an AI.

**Not allowed to:** approve a phase without having seen the actual diff (reviewing a summary is not the same as reviewing the diff).

### Planner / Architect / Reviewer / Risk Controller (ChatGPT, or any planning-mode AI)
Produces planning reports before implementation, identifies risk and ambiguity, asks clarifying questions rather than guessing, and reviews implementation output for correctness and scope adherence.

**Not allowed to:** implement code or run commands directly; assume a fact about production/staging state without it being either freshly verified or explicitly flagged as a prior-phase finding that needs re-verification.

### Implementer / Local Coding Agent (Claude)
Implements only the explicitly approved scope (exact file allow-list), runs local verification (type-check, build, local Docker for testing — never against production), shows full diffs before commit, stages only approved files, and stops if anything unexpected appears (an unstaged file, a failing safety check, a destructive command).

**Not allowed to:** SSH into any server, touch any server directly, expand scope beyond the approved file list without asking, stage or commit without explicit instruction, use `git add .`/`git add -A`, or run destructive Docker/git commands without explicit per-instance approval.

### Server / Operator Role (User, when acting as the human with server access)
Runs SSH sessions, executes server-side commands (backups, restores, deploys, container management), and pastes output back for analysis. This role exists specifically because Claude has no SSH access — every server-side action in this project's history has gone through this role.

**Not allowed to:** skip the backup step before a destructive or deploy action; run a script handed over without reading what it does first.

## Phase Lifecycle

Authoritative 11-step version: [Phase-Process.md](Phase-Process.md) (Idea → Business Value → Product Review → Architecture Review → Technical Plan → Implementation → Code Review → QA → Production → Documentation → Close Phase).

**AI-specific overlay** observed in practice across this project's phases: every phase starts as a **Planning** message (ChatGPT or planning-mode Claude, read-only, no file changes), gets an explicit **approval** message from the user before any implementation, implementation happens in a separate message scoped to an exact file allow-list, and the diff is shown in full (never summarized) before any commit instruction is given.

## Planning Prompt Template

```
Start Phase <N> Planning — <short title>.

Goal:
<what this phase is trying to determine or achieve>

Context:
<relevant current state, prior phase results, constraints>

Planning only.
Do not implement.
Do not modify files.
Do not commit.
Do not run Docker.
Do not SSH. (if relevant)

Inspect:
<specific files/docs to read>

Questions to answer:
<numbered list>

Return:
<exact expected output shape>

Do not implement until approved.
```

## Implementation Prompt Template

```
Phase <N> — Implement <short title>.

Planning approved.

Scope:
<exact allow-listed files — nothing else>

Do not edit:
<explicit exclusion list>

Do not commit.
Do not push.
Do not run Docker. (if relevant)

Required content/behavior:
<exact, specific requirements>

After implementation, run:
<verification commands>

Then paste:
<exact diff/status commands expected back>

Do not commit.
Do not push.
```

## Claude Prompt Rules

- Always state the exact allow-listed file(s) — Claude treats anything outside that list as out of scope, even if it would be a "small, obviously safe" related fix.
- Always include explicit stop conditions (do not commit/push/run Docker/SSH) even when they seem redundant with a prior phase — each phase is scoped independently, approval does not carry over.
- Expect Claude to flag, not silently resolve, any unexpected finding (an untracked file appearing, a safety-check failure, a typo report that turns out not to exist).

## Diff Review Requirements

Full unified diff, never a summary, shown before any commit instruction. If a file is new/untracked, `git diff --stat` alone shows nothing for it — full content must be shown separately (`cat` or a `--no-index` diff against `/dev/null`).

## Commit Rules

Authoritative: [Git-Workflow.md](Git-Workflow.md) (commit message format, one logical change per commit, never amend by default, never `git add -A`). AI-specific addition: never stage a file that wasn't in the explicitly approved list for that phase; if `git status` shows something unexpected already staged or untracked, stop and flag it rather than including or silently ignoring it.

## Deploy Rules

A fresh, restore-verified backup immediately before any deploy that touches a server holding real or non-trivial data. Post-deploy verification checklist run every time (container health, smoke tests) — never assumed to have worked just because the command exited 0.

## Production Rules

- No seed script run against production, ever.
- No data deletion or reset without backup + classification + explicit operator approval (see [Decision-012](../00-Company/Decisions/Decision-012-Pilot-Deployment-Choice.md) and the freeze-don't-delete default it established).
- No casual `docker compose down` — data volumes must be understood before any stop/remove action.
- Default posture on any ambiguous data: treat as if it might be real until a human confirms otherwise.

## Staging Rules

Demo/training/testing only — real patient data must never enter staging. Seed/demo credentials are intentionally public within the team (documented in [DEMO_USERS.md](../../DEMO_USERS.md)) — this is acceptable only because staging never holds real data.

## Decision Record Rules

A numbered `Decision-0XX.md` is created when a choice is durable, affects future phases' default behavior, and would be expensive to re-derive from chat history later (e.g., environment choice, workflow policy). A phase-log entry (e.g., [Staging-Phase-Log.md](../04-Operations/Staging-Phase-Log.md)) is enough for a one-off bug fix or routine operational event that doesn't change future defaults.

## Docs Update Protocol After Each Phase

Phase-Process.md's step 10 ("Documentation") should explicitly ask: does this phase change [PROJECT_BRAIN.md](../PROJECT_BRAIN.md)'s "Current Status" section, or [Environment-Registry.md](../04-Operations/Environment-Registry.md)'s facts? If yes, update them in the same phase that caused the change — not deferred to a later cleanup pass, which is how documentation goes stale unnoticed.

## Kanban / Status Model

| Status | Meaning |
|---|---|
| Backlog | Identified, not yet scoped |
| Ready for Planning | Worth doing next, planning message can be written |
| Planning | Planning message sent, awaiting return |
| Approved | User has approved the plan, not yet implemented |
| Implementation | Implementation in progress |
| Needs Review | Diff produced, awaiting user review |
| Ready to Deploy | Committed/pushed (if applicable), awaiting deploy approval |
| Verifying | Deployed, verification checklist in progress |
| Closed | Verified and confirmed complete |
| Deferred | Deliberately postponed, with a stated reason and trigger condition for revisiting |

## AI Failure Prevention

- **Memory loss (context compaction/new session):** Re-read [PROJECT_BRAIN.md](../PROJECT_BRAIN.md) and the relevant phase log before acting — don't assume continuity of facts not actually re-verified.
- **Hallucination:** Never state a file path, commit hash, or fact as true without having just verified it (`ls`, `git log`, direct read) in the current session — a memory saying something existed is a claim about the past, not the present.
- **Stale assumptions:** Point-in-time findings (a backup check, a data classification, a "confirmed healthy" status) are not continuously true — re-verify before relying on them for a new decision, exactly as already practiced in [04-Operations/README.md](../04-Operations/README.md)'s backup-status section.
- **Role confusion:** Claude does not SSH or treat itself as having server access, ever, regardless of how the request is phrased.
- **Staging/production confusion:** Verified concretely in Phase 0E-C22 — a server's **hostname** (`sdhp-staging`) does not reliably indicate its **actual role** (it was running production). Always confirm role by domain, compose project name, and actual running stack — never by hostname alone. See [Environment-Registry.md](../04-Operations/Environment-Registry.md).
