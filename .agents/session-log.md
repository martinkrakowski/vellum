# Session Log

A running record of AI-assisted work sessions. After each session, append an
entry using the template below. Keep entries short — this is a memory aid for
the next session, not documentation.

Unlike the other `.agents/*.md` spec files (which AGENTS.md marks "never edit"),
this file is **append-only by design** — adding session entries is expected.

To keep this file out of version control, add `.agents/session-log.md` to
`.gitignore`.

---

## Template (copy for each session)

**Session:** YYYY-MM-DD — topic

- **Mode:** Implementer
- **Changes:**
  - (what was edited, at a file/feature level)
- **Decisions:**
  - (choices made and the reason, so they are not relitigated)
- **Left open:**
  - (follow-ups, known gaps, anything the next session should pick up)

---

## 2026-01-01 — example entry

- **Mode:** Architect
- **Changes:**
  - none (planning only)
- **Decisions:**
  - Adopted the Hexagen template system for infrastructure slices.
- **Left open:**
  - Decide which auth provider template to install.

---

## 2026-07-06 — initial code review, git baseline, remediation plan

- **Mode:** Reviewer → Implementer (toolchain unblocking + git/docs only)
- **Changes:**
  - `package.json`: `@hexagen-monaco/*` `^0.8.1` → `^0.8.0` (0.8.1 not on npm; install was broken)
  - all `packages/*/tsconfig.json`: added `include: ["src"]` (vitest.config.ts broke `rootDir` builds)
  - `.gitignore`: added `!.env.*.example` (eight template env references were silently ignored)
  - `git init` on `main`; baseline commit of the full scaffold
  - `docs/planning/2026-07-06-scaffold-remediation-plan.md`: full plan for all open findings
- **Decisions:**
  - Internal packages will be consumed from source (JIT pattern, exports → `src/index.ts` + `transpilePackages`) — planned, not yet applied
  - Orphaned root template code (supabase/bullmq/llm/mcp/auth/rate-limit, ~90 files) will be deleted; design-system files relocate to `apps/web/src` so DESIGN.md paths stay truthful — planned
  - State machine stays a pure reducer, no XState (manifest pins this)
- **Left open:**
  - Everything in the plan: Phase 1 (lint stubs, exports, turbo.json) is the next session's starting point
  - `yarn lint` currently red in 7 packages (empty generated port-stub interfaces) — known, planned
  - Bottle GLB asset is the longest-lead item; start early

---

## 2026-07-06 (later) — phases 1–5 executed, MVP live, stacked PRs #6–#10

- **Mode:** Implementer
- **Changes:**
  - Phase 1–3 (PRs #6–#8): lint green, source exports (JIT) + transpilePackages, turbo outputs, orphan template code deleted, design system relocated to apps/web, docs aligned
  - Phase 4 (PR #9): full MVP — scene-types Zod contracts, correction-delta, feedback/lifecycle/audit domain, pure reducer + runGeneration, mock pipeline (5.3s), transform-aware distortion heuristic, parametric bottle (~1.49 stretch ratio), ThreeJsSceneAdapter, R3F canvas, split view, dashboard, composition root, generated label textures
  - Phase 5 (PR #10): live browser dry-run; fixes: GLB export targets bottle group only (ContactShadows RT texture broke GLTFExporter), hero camera pulled back; docs/demo-runbook.md
- **Decisions:**
  - Distortion warning is transform-aware (geometric ratio ÷ repeatX/repeatY) so the UV_DISTORTION correction measurably clears it — the demo's payoff
  - Hand-maintained barrels must NOT carry the `@generated` header or sync rewrites them from its *.adapter.ts convention
  - `yarn workspace X lint` fails (yarn 4 exposes only declared deps' binaries; generator omitted eslint devDeps) — always gate through turbo
- **Left open:**
  - Dependabot PRs #1–#5 (incl. Next 16, ESLint 10 majors) parked — decide after demo
  - OTHER-category and maxRetries paths verified by unit tests only, not browser-driven
  - shadcn/ui deliberately deferred; ui stubs suffice
