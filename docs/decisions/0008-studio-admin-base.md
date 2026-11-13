# 0008. Studio Admin as the UI base

Date: 2026-11-12 · Status: Accepted

## Context

The assessment rewards working features, not a hand-built component library. Starting from scratch
would spend days on a sidebar, theming and tables. Mixing several templates gives inconsistent
tokens and duplicated components.

## Decision

Start from Studio Admin (MIT): Next.js 16, Tailwind v4 and shadcn/ui with a responsive dashboard
shell. Keep only the shell, the shadcn primitives and the preference system; delete the demo
screens, unused primitives and their dependencies. Restyle with a ZEGA palette inspired by
MaintainX (one blue accent on neutral surfaces, Inter). Screen code is co-located with its route.

Deliberate changes to the shared primitives are limited to project-wide rules: form fields and
selected options show focus or selection with a border colour change only.

## Consequences

- Accessible Radix-based primitives and a consistent design system from day one.
- Template leftovers had to be removed explicitly (done before release).
- Upstream template updates are not merged automatically; the copy is now owned by this project.
