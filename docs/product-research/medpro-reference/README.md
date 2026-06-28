# MedPro Reference Research — README

## What this is

This folder is a **reference research area**, not implementation documentation. It exists to capture what we observe in MedPro (a third-party clinic management product used as a reference point) so that we can later compare it against Elaji Health's own product direction.

**This is not a spec. This is not a backlog. This is not something to copy from.**

## Why MedPro

MedPro covers many modules similar to Elaji's long-term vision: patients, appointments, waiting queue, visits, prescriptions, lab, pharmacy, accounting, reports, users/permissions, inventory, insurance, dental, and clinic settings. Studying how an existing product in this space models these domains helps us:

- Spot domain concepts, entities, or workflows we may not have considered.
- Sanity-check our own data model and state machines against a working reference.
- Identify gaps between what Elaji currently supports and what the broader product category typically covers.

## What this is NOT

- **Not a UI to copy.** We extract domain logic, workflows, entities, business rules, and module structure — never visual design, layout, or styling.
- **Not a feature requirement.** Nothing here implies Elaji must build any of it. Decisions about what Elaji actually builds belong in `docs/elaji-planning/`, not here.
- **Not verified against MedPro's actual behavior beyond what we observe.** We only document what is explicitly shown in a video or screenshot we were given. We do not infer, assume, or fill in gaps from general knowledge of similar products.

## Rules for contributing notes here

1. **Do not invent MedPro features.** Only document what is explicitly shown in a provided video or screenshot.
2. **Mark anything unclear as an Open Question** rather than guessing.
3. **Keep MedPro reference notes separate from Elaji implementation decisions.** This folder describes MedPro. `docs/elaji-planning/` describes Elaji's own plans, informed by (but distinct from) this research.
4. **Extract domain logic, not UI.** Note entities, statuses, business rules, relationships, and permissions implied by behavior — not colors, icons, or pixel layout.

## Folder structure

```
docs/product-research/medpro-reference/
  README.md                    — this file
  videos/                       — one structured note per MedPro tutorial video analyzed
    INDEX.md                    — running index of all video notes
  screenshots/                  — supporting screenshots referenced by video notes
  extracted-blueprints/         — synthesized cross-video documents (entities, workflows, permissions, reports)
```

## Relationship to `docs/elaji-planning/`

| This folder (`medpro-reference/`) | `docs/elaji-planning/` |
|---|---|
| Describes what MedPro does, as observed | Describes what Elaji will/won't do |
| Source: provided videos/screenshots only | Source: this research + Elaji's own product decisions |
| No Elaji commitments implied | Where actual roadmap commitments live |

See `docs/elaji-planning/ELAJI_GAP_ANALYSIS.md` for where MedPro observations get turned into Elaji-specific decisions.
