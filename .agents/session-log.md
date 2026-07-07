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
