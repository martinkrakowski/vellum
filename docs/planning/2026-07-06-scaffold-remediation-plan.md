# Scaffold Remediation & Development Plan

**Date:** 2026-07-06
**Status:** Proposed
**Baseline:** `main` — hexagen-monaco scaffold with working install/build/typecheck
(see the baseline commit message for the three fixes already applied).

This plan covers every open finding from the initial code review, in dependency
order, plus the bridge from a clean scaffold to the Vellum MVP. Each phase has
explicit acceptance criteria and the command that proves it.

Findings are numbered `F1..F6` and referenced throughout.

---

## Open Findings (from the 2026-07-06 review)

| #  | Finding | Severity | Phase |
| -- | ------- | -------- | ----- |
| F1 | `yarn lint` fails in 7 packages — generated port stubs declare empty interfaces (`@typescript-eslint/no-empty-object-type`) | Blocker for CI | 1 |
| F2 | Package `main`/`exports` point at `./dist/index.js`, but builds are `emitDeclarationOnly` — the file never exists. Any runtime resolution through `exports` (Next bundling, cross-package Vitest) will fail | Blocker (latent) | 1 |
| F3 | `turbo.json` declares no outputs for the app builds (`.next/**`, `.output/**`) and is missing the manifest's `globalDependencies: ['**/.env.*']` | Cache correctness | 1 |
| F4 | ~90 files of orphaned template code at the repo root (`src/`, `app/`, `server/`, `middleware.ts`, `types/`, `bin/`, docker files, `supabase/`) — outside every workspace, unchecked by any tool, importing 15+ undeclared packages. Includes the design-system files that DESIGN.md treats as contract | Structural | 2 |
| F5 | Doc drift: SETUP.md says "Framework: **nitro**"; AGENTS.md protects `package-lock.json` in a yarn 4 repo; `eslint.no-console.mjs` is referenced by nothing; the project brief's starting-point paths (`/src/types/scene.ts`, `/src/features/scene-port/ScenePort.ts`) don't exist | Hygiene | 3 |
| F6 | No demo dependencies installed (three, R3F, drei, Tailwind, shadcn/ui), zero tests, packages are empty skeletons | Expected — implementation not started | 4–6 |

---

## Phase 1 — Toolchain fully green (F1, F2, F3)

Goal: `yarn build && yarn typecheck && yarn lint && yarn test && yarn lint:arch`
all exit 0, and stay meaningful as code lands.

### 1.1 Port stub lint failures (F1)

Affected files (identical shape, `interface XxxPort {}` at line 8):

- `packages/asset-loader/src/application/ports/out/ExternalServiceClient.out-port.ts`
- `packages/distortion-detection/src/application/ports/out/ExternalServiceClient.out-port.ts`
- `packages/scene-export/src/application/ports/out/ExternalServiceClient.out-port.ts`
- `packages/scene-port/src/application/ports/out/ExternalServiceClient.out-port.ts`
- `packages/audit-governance/src/application/ports/out/RelationalDb.out-port.ts`
- `packages/review-lifecycle/src/application/ports/out/RelationalDb.out-port.ts`
- `packages/scene-orchestration/src/application/ports/out/DocumentDb.out-port.ts`

**Decision: fill the interfaces with their real minimal contracts** rather than
suppressing the rule. The manifest already specifies what each port does
(§ Phase 4.2 lists the signatures), so the lint error is best treated as a
prompt to write the actual seam. Where a port genuinely cannot be designed yet,
use a single-line `// eslint-disable-next-line @typescript-eslint/no-empty-object-type`
with a `TODO(<context>)` naming the blocking decision — never a blanket rule
change, because the rule is doing exactly what we want everywhere else.

Note: several of these generated stubs are misnamed for their context (the
review-lifecycle port is not a relational DB in this demo — there is no DB).
Renaming/removing them is folded into Phase 4.2 where the real ports are
defined; for Phase 1 only the lint signal has to become intentional.

**Accept:** `yarn lint` exits 0 with no rule disabled globally.

### 1.2 Package resolution strategy (F2)

**Decision: internal packages are consumed from source** (Turborepo
"just-in-time" pattern). Rationale: all `@vellum/*` packages are pure TS
consumed only by apps in this monorepo; a compile step adds watch-mode
complexity for zero demo value.

Changes, all 17 `packages/*/package.json`:

```json
"main": "./src/index.ts",
"types": "./src/index.ts",
"exports": { ".": "./src/index.ts" }
```

Plus:

- `apps/web/next.config.ts` (new file):
  `transpilePackages: [/* the @vellum packages web imports */]` — Next compiles
  workspace TS it pulls in via `exports`.
- Keep `build: tsc` (emitDeclarationOnly) in each package: it no longer feeds
  resolution, but it is the isolated type-check gate turbo's `^build` graph
  runs, and hexagen sync expects the script. Document this in the plan-of-record
  so nobody "fixes" it back.
- Vitest resolves `exports` → `.ts` natively; no config change needed.

Alternatives rejected:
- *Emit JS (`emitDeclarationOnly: false`)* — requires `tsc --watch` per package
  during dev or stale-dist bugs; wrong trade-off for a demo repo.
- *tsup/bundling per package* — 17 build configs for zero consumers outside the
  repo.

**Accept:** a scratch import of `@vellum/shared` from `apps/web/src/app/page.tsx`
builds (`yarn build`) and a scratch cross-package Vitest test passes; scratch
changes reverted after verification.

### 1.3 turbo.json (F3)

- `build.outputs`: add `.next/**`, `!.next/cache/**`, `.output/**`, `.nitro/**`
  alongside `dist/**`.
- Add top-level `globalDependencies: ["**/.env.*"]` (declared in
  `.architecture/manifest.yaml` but never emitted — generator sync drift; keep
  turbo.json and the manifest in agreement).

**Accept:** `yarn build` twice in a row — second run is `FULL TURBO` (all cache
hits) with **no** "no output files found" warnings.

---

## Phase 2 — Quarantine orphaned template code (F4)

Goal: nothing at the repo root that no tool checks; every file is owned by a
workspace or is genuinely repo-level config. Everything here is recoverable via
the baseline commit — delete boldly.

### 2.1 Relocate (design system + app-adjacent, referenced by DESIGN.md/SETUP.md)

Move into `apps/web/src/`, preserving the `src/...` path shape so DESIGN.md's
references (`src/styles/tokens.css`, `src/components/ui/`) stay truthful
*relative to the app* — DESIGN.md itself is a never-edit contract:

| From (repo root)                  | To                              |
| --------------------------------- | ------------------------------- |
| `src/styles/{tokens.css,globals.css,theme.ts}` | `apps/web/src/styles/` |
| `src/components/ui/*`             | `apps/web/src/components/ui/`   |
| `src/lib/cn.ts`                   | `apps/web/src/lib/cn.ts`        |
| `app/components/ErrorBoundary.tsx`, `ErrorFallback.tsx` | `apps/web/src/components/` (verify their imports first; strip any dependency on deleted infra) |
| `src/config/{env.ts,env.server.ts,env.client.ts}` + `src/shared/result.ts` | `apps/web/src/{config,shared}/` — SETUP.md's env-validation flow depends on these |
| `scripts/check-env.ts`            | stays at root; update its import paths to `apps/web/src/config/` |
| `tailwind.config.ts`              | `apps/web/tailwind.config.ts` — content globs updated to app-relative paths |

Dependency additions to `apps/web` this forces (all small, all in-stack):
`clsx`, `tailwind-merge` (for `cn()`), `zod` (env validation — also needed by
`scene-types` in Phase 4 anyway). Tailwind itself is installed in Phase 4.1;
until then `globals.css` (which contains `@tailwind` directives) must **not**
be imported by `layout.tsx` — import `tokens.css` only.

### 2.2 Delete (non-goal backend templates, per the project brief)

- `src/infrastructure/` — entire tree: supabase, queue/BullMQ, llm (5 provider
  adapters + router), mcp, auth, logging, errors
- `src/domain/`, `src/application/` (root-level; the real domain lives in
  `packages/*`)
- `server/` (rate-limit middleware stack), `middleware.ts`, `types/rate-limit.d.ts`
- `app/api/`, `app/admin/` (health, auth/me, bull-board routes), then the
  emptied `app/` and `src/` root dirs
- `bin/cli.ts`
- `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.override.yml`,
  `docker-compose.ci.yml`
- `supabase/` (migrations + seed), `scripts/gen-types.sh`
- `.mcp.json.example`, and the env templates for deleted slices:
  `.env.{bullmq,supabase,mcp,llm,auth,rate-limit,observability,shared-types}.example`
- `eslint.no-console.mjs` — unreferenced; per AGENTS.md conventions the
  no-console ban applies only "if the template is installed", and we are
  uninstalling it. Structured-logging preference is unaffected.

Keep: `.env.example` (base reference), `.github/dependabot.yml`,
`tsconfig.base.json`, `.yarnrc.yml`, `.gitignore.hexagen`,
`.architecture/`, `.agents/`.

### 2.3 Consistency sweep after the move

- Run `yarn sync:check` / `yarn templates:validate` — confirm hexagen tooling
  does not expect the deleted template files (if it does, record the template
  uninstall the way hexagen expects rather than fighting sync).
- Grep for imports of any deleted path; must be zero.

**Accept:** full toolchain green; `git grep -l "src/infrastructure\|bull-board\|supabase"`
returns only docs/planning and `.architecture/` history; repo root contains no
un-owned source files.

---

## Phase 3 — Documentation alignment (F5)

AGENTS.md and DESIGN.md are never-edit contracts; changes to them are
deliberate, called out in their own commit, and justified here:

1. **AGENTS.md** — one surgical row fix: `package-lock.json` → `yarn.lock`
   ("Updated only via `yarn` commands"). Justification: the repo is yarn 4;
   protecting a file that cannot exist protects nothing.
2. **SETUP.md** — replace "Framework: **nitro**" with the real topology
   (Next.js app in `apps/web`, Nitro API in `apps/api`); update env-validation
   paths to `apps/web/src/config/`; drop setup steps for deleted templates.
3. **`.agents/tech-stack.md`** — as Phase 4 lands dependencies, add rows in the
   same change (the file itself demands this): three.js, @react-three/fiber,
   @react-three/drei, camera-controls, Tailwind, shadcn/ui, zod. This is a
   spec-file edit that AGENTS.md conditions on being "explicitly asked" —
   treat this plan's approval as that ask, and keep the edits additive.
4. **Project brief drift** — the brief's starting points
   (`/src/types/scene.ts`, `/src/features/scene-port/ScenePort.ts`) map to
   `packages/scene-types/src/` and `packages/scene-port/src/` in the generated
   layout. The brief is external to the repo; this plan is the in-repo record
   of the mapping.

**Accept:** a new contributor following SETUP.md top-to-bottom reaches a running
`yarn dev` without hitting a reference to a deleted file.

---

## Phase 4 — MVP foundation (F6): contracts → seams → logic

Order matters: types first (everything imports them), then ports, then pure
logic with tests, then adapters, then UI. This is also the order that keeps
`yarn lint:arch` green throughout — dependencies only ever point inward.

### 4.1 Dependencies & assets

- `apps/web`: `three`, `@react-three/fiber`, `@react-three/drei`,
  `camera-controls`, Tailwind (+ PostCSS wiring, `darkMode: "class"` per
  DESIGN.md), shadcn/ui init, `zod`.
- State machine: **pure reducer, no XState** — the manifest pins this
  ("zero framework dependency… the reducer is the architectural seam").
- Assets into `apps/web/public/assets/`: one calibrated bottle GLB with a
  `LabelMesh` node and deliberate UV stretch at the bevel; `label-attempt-1.png`,
  `label-attempt-2.png` (attempt-keyed filenames — TextureLoader cache strategy
  from the manifest).
- Asset acquisition is the schedule risk (see Risks); start it first.

### 4.2 `scene-types` — the shared contract (blocks everything)

Zod schemas + inferred types, no runtime logic: `SceneConfig`,
`TextureTransform` (`repeatX/repeatY/offsetX/offsetY/rotation`),
`FeedbackCategory` (`UV_DISTORTION | OTHER`), `FeedbackPayload`,
`SceneIteration`, `AuditTrail` (incl. `brandGuidelinesVersion`),
`PipelineStep` events, `ReviewState` union. Port interfaces live with their
consumers: `ScenePort`, `PipelinePort` (scene-orchestration), `AssetPort`
(asset-loader), `ExportPort` (scene-export), `TextureGenerationPort`
(texture-generation). This is where the Phase 1.1 placeholder stubs get
replaced or renamed for real.

### 4.3 Pure logic + tests (the interview-quality core)

- `correction-delta`: `CATEGORY_CORRECTIONS` table + `applyCorrectionDelta()`.
  Property: every category produces an observable, testable transform change
  (UV_DISTORTION) or an explicit texture-only re-run (OTHER). **Unit tests
  first** — this is the easiest place to demonstrate test discipline.
- `scene-orchestration`: reducer over `MachineContext`
  (idle → generating → reviewing → rejected/regenerating → approved /
  maxRetriesReached). Exhaustive transition tests, including illegal-transition
  rejection. No Three.js, no React imports — enforced by `lint:arch`.
- `review-lifecycle`: `buildIteration()` pure factory; append-only iteration
  ledger tests.
- `feedback-domain`: category validation before REJECT is accepted.
- `audit-governance`: `AuditTrail` synthesis from a completed context.

### 4.4 Adapters

- `pipeline-simulation`: `MockPipelineAdapter` emitting typed `PipelineStep`
  events from inside the promise chain (never detached timeouts), calibrated
  ~5.3 s total; `MockSceneAdapter` for reducer tests without a canvas.
- `texture-generation`: `MockTextureAdapter` (attempt-keyed URLs +
  `?t=` cache-bust); `FireflyTextureAdapter` as a typed stub — the production
  seam the demo narrates.
- `asset-loader`: GLTFLoader/TextureLoader wrapper, `SRGBColorSpace` enforced.
- `scene-port`: `ThreeJsSceneAdapter` — two-phase `configure()` behind a
  `modelLoaded` flag, inline 15-line typed emitter (no Node EventEmitter),
  `initialize(refs)` entry point.
- `distortion-detection`: canvas-based UV pixel-density heuristic,
  `stretchRatio > 1.3` → `distortionWarning`.
- `scene-export`: GLTFExporter path with `renderer.initTexture()` pre-call;
  fallback (AuditTrail JSON + `canvas.toBlob()` screenshot) built **first**
  since it is also the governance artifact.

### 4.5 UI (apps/web)

`scene-renderer` (Canvas host + `SceneInitializer`), `camera-control`
(drei `CameraControls`: disable input → tween to hero → autoRotate →
re-enable), `split-view`, `review-dashboard` (stepper, approve/reject CTA bar,
feedback modal, iteration history, amber distortion badge, maxRetriesReached
state), wired to the reducer via a thin React binding in the app — packages
stay framework-pure per the manifest.

---

## Phase 5 — Verification & demo readiness

- CI-shaped gate (even if run locally):
  `yarn build && yarn typecheck && yarn lint && yarn test && yarn lint:arch`.
- Demo script dry-runs: happy path; rejection path
  (UV_DISTORTION → visible `repeatX` correction on re-run); OTHER-category path
  (texture re-run, transform unchanged); export in `approved` state only.
- Cross-check every DESIGN.md component constraint against the shipped UI
  (radius, focus ring, aria states).
- Record a fallback screen capture of the full demo — projector insurance.

---

## Risks & mitigations

| Risk | Mitigation |
| ---- | ---------- |
| Calibrated bottle GLB (LabelMesh node, deliberate bevel UV stretch) doesn't exist yet — longest-lead asset | Start Blender work in parallel with Phase 1; fallback is a parametric cylinder-with-bevel generated in code, which also makes the UV stretch reproducible |
| GLTFExporter texture embedding is flaky | Fallback export (AuditTrail JSON + screenshot) is built first and is the primary governance artifact anyway |
| hexagen `sync`/`arch validate` may regenerate or complain about deleted template files (Phase 2) | Run `yarn sync:check` before and after; if sync wants the files back, record a template uninstall in `.architecture/` instead of hand-deleting |
| `transpilePackages` + tsconfig-paths interplay in Next 15 | Verified by the Phase 1.2 scratch-import acceptance test before any real feature depends on it |
| Turbo cache serving stale app builds once outputs are declared | `globalDependencies` on env files (1.3) plus turbo's content hashing; spot-check with a `--force` build before the demo |

## Suggested commit/branch sequence

One branch per phase, conventional commits, squash on merge:

1. `chore/toolchain-green` — Phase 1 (three commits: stubs, exports, turbo)
2. `chore/quarantine-templates` — Phase 2 (relocate commit, delete commit)
3. `docs/align-setup-and-specs` — Phase 3
4. `feat/scene-types`, `feat/correction-delta`, `feat/state-machine`, … —
   Phase 4, one bounded context per branch
5. `chore/demo-readiness` — Phase 5
