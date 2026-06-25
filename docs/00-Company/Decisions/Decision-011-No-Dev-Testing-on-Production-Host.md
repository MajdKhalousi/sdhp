# Decision 011 — No Dev Testing on Production Host

**Status:** Approved
**Last updated:** Phase 0D-D

## Purpose

Document the rule that development, QA, live walkthroughs, and pilot testing must not run on the same host as live production.

## Context

Phase 0D-B attempted to start a live application walkthrough but stopped safely after discovering that the current host runs the live SDHP production stack and also has an unrelated golden_net project occupying standard development ports.

The production stack was left untouched. No production service, database, schema, compose file, env file, or source code was modified.

## Decision

Development, QA, live walkthroughs, pilot simulations, demo data, and test data must not run on the production host.

A dedicated environment must be used instead:
- separate staging VPS/server, or
- truly local developer machine with no production containers.

The current production host must not be used for dev stack activity, even with remapped ports, except as an explicitly approved emergency stopgap.

## Rationale

Running dev/testing on a production host creates avoidable risk:
- shared Docker daemon
- possible env confusion
- possible port conflicts
- possible accidental connection to production database or MinIO
- possible operational mistakes against production containers
- unclear separation between real data and test data

Even if port remapping works technically, it does not provide strong operational isolation.

## Implications

- Phase 0D-B live walkthrough must be rerun only on a dedicated environment.
- A staging environment should be provisioned before pilot testing.
- Test records must never be created in production.
- Production credentials must never be copied into a dev/walkthrough environment.
- Future QA and pilot-demo work should target staging first.

## Approved Testing Environments

Allowed:
- Dedicated staging VPS/server.
- Clean local developer machine with no production containers and no production data.

Not allowed:
- Live production host.
- Production database.
- Production MinIO bucket.
- Production Redis.
- Any environment using production credentials for test activity.

## Related Phases

- Phase 0D-B — Live Application Walkthrough paused due to unsafe environment.
- Phase 0D-C — Dedicated Walkthrough Environment Planning.
