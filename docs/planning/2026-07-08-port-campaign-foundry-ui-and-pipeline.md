# Vellum as an Enterprise 3D Asset Marketing Pipeline — Feature & Development Plan

**Date:** 2026-07-08 (rev 2 — incorporates the brainstorm)
**Status:** Proposed
**Relationship to campaign-foundry:** campaign-foundry is the **submitted demo
and is frozen**. Vellum is a **standalone, deliberately over-the-top** extension
that *mirrors* campaign-foundry's proven patterns as a reference — it never
restructures or depends on campaign-foundry, and campaign-foundry does not
become part of it.
**Goal:** Grow vellum from a polished mock (static label texture + timed fake
pipeline) into a genuine **enterprise 3D product-marketing asset pipeline**:
brand brief → real model-backed art generation → exact brand compositing →
mapping onto calibrated 3D product geometry → matrix spatial review + governance
→ multi-channel export.

> Scope note: because vellum is a personal "go big" effort rather than a
> deliverable under deadline, the phases below are a **build order** (dependency
> sequence), **not** a v1-vs-later scope gate. The full enterprise scope is
> in-scope; phases just sequence how to get there without painting into a corner.

---

## 0. The reframe: one continuous brand-to-product pipeline

Vellum today is a beautiful shell around two mocks — the label is one of two
static PNGs picked by attempt number (the prompt never touches the image), and
the "pipeline" is calibrated `setTimeout`s. The enterprise product is a single
continuous thing: **from a brand brief to a physically-plausible, governed,
multi-channel 3D product asset.** That's a real category — packaging
previsualization / virtual product photography / PDP-and-AR asset production.

Campaign-foundry's generation matrix translates directly into 3D and becomes the
spine of vellum's data model:

> **campaign-foundry:** `product × aspect-ratio × treatment`
> **vellum:** `product-model × surface / UV-region × treatment × market`

Everything below hangs off that matrix.

## 1. The load-bearing finding: generation alone can't make a label

Generative image models mangle text, logos, barcodes, and regulatory copy — the
exact things a package must render pixel-perfect. A naive "prompt → image → wrap"
pipeline produces beautiful, unshippable garbage.

**Therefore the pipeline must generate the *background/art*, then composite exact
vector brand assets on top** (headline, logo, regulatory panel, barcode), and the
*composite* becomes the texture. Campaign-foundry already solved this with its
5-layer `@napi-rs/canvas` compositor (bg → contrast shade → brand-color band →
wrapped copy in a bundled font → anchored logo). **Porting that compositor is
therefore backbone, not a nice-to-have**, and the generation prompt must be
constrained to "background art only — no text/logos/watermarks" (which
campaign-foundry already enforces). This single fact shapes the whole generation
track.

---

## 2. The production bar to hit (campaign-foundry's 7 characteristics)

| # | Characteristic | Application in vellum |
| - | --- | --- |
| P1 | Narrow outbound port + injectable-SDK-slice adapter + mock floor | Keep vellum's existing `TextureGenerationPort`; add real Firefly/Imagen adapters that narrow the SDK to an injectable client for tests. Today's two static PNGs **become the offline procedural floor**. |
| P2 | Constructor-injected fallback chain; provenance propagates; degradation observable | Firefly → Imagen → static-floor, **key-gated** (no creds → skip). Record a `TextureSource` union per asset; surface it as a badge in review and in the audit trail. |
| P3 | Bounded-concurrency pool | Essential at matrix scale (models × surfaces × treatments × markets = hundreds of generations). Port the zero-dep pool. |
| P4 | Cached + in-flight-coalesced auth | Port directly for the Firefly IMS token adapter. |
| P5 | `Result<T,E>` + boundary validation + path-safe-slug identity | Adapters return `Result` (align with vellum's `Result`); slugs (`model/surface/treatment/market`) are filename + provenance + idempotency key. |
| P6 | Append-only execution log + per-asset provenance sidecar | Extend vellum's existing `AuditTrail` to record model, provider, prompt, seed, and source per iteration. |
| P7 | Explicit `loadEnv()` announcing effective providers | Add to `apps/api` startup: announce active providers; keyless → "running on offline floor." |

---

## 3. What's genuinely new in 3D (the gaps a 2D pipeline doesn't have)

These are first-class features, not afterthoughts:

- **Seams.** A wraparound label's left edge meets its right edge; generative art
  is oblivious. Needs seamless/tiling generation or inpainted seams — *and* the
  spatial review must expose the seam as a canonical review angle.
- **UV-aware generation.** Generate to the label's actual unwrapped aspect ratio
  and safe zones, or distortion is guaranteed. Productive tension: generation
  minimizes distortion, review exists because it won't be perfect.
- **PBR, not just color.** Real products are albedo + normal + roughness +
  metallic, with material zones (glossy label on matte bottle, foil accents).
  The "Substance" half of the Adobe framing — material-zone assignment early,
  generated material maps later.
- **Color management.** Does the render match the printed product? Pantone/spot
  colors, ICC profiles, screen-vs-print gamut. A real brand-approval blocker;
  campaign-foundry already stamps "RGB, not colour-managed."
- **Canonical review + turntable.** Orbit is for exploration; approval needs
  standardized angles (hero, seam, top, shelf-context) and an auto-generated
  turntable video per asset so reviewers compare like-for-like. Lighting/
  environment presets (studio, retail shelf, outdoor, in-hand).
- **Reproducibility.** Generative models are non-deterministic; brand approval
  requires regenerating an approved asset exactly → **seed pinning + full param
  capture** (campaign-foundry explicitly has no seeds — vellum fixes this).
- **Cost governance at matrix scale.** Per-run budgets, model allowlists, caching
  by prompt+params hash, bounded concurrency.

---

## 4. Development tracks & build order

Independent tracks; phases sequence dependencies. All of it is in scope.

### Phase 1 — Foundation & the review *console* (Track A)
- `packages/ui` (vellum JIT-source conventions: `exports`→`src/index.ts`,
  `transpilePackages` + `extensionAlias`, manifest-registered + arch-linter
  whitelisted; vellum has **no 100% coverage gate**, so extraction is low-friction).
- Adopt campaign-foundry's dark-first, Firefly `#1473e6` token set (vellum keeps
  its own `DESIGN.md` contract — campaign-foundry lacks one — and updates it in
  lockstep).
- Port the **paradigm**, not the chrome: a review **console** — `grid` (matrix),
  `runs` (history), `compliance`, `export` routes + the shell
  (Header/Sidebar/CommandBar/TelemetryDrawer). Each grid tile is a **3D turntable
  thumbnail**, not a flat artboard. Port generic primitives (Accordion, Modal/
  Drawer, layout shells, `SourceBadge`); leave campaign-foundry's domain-coupled
  composites behind.

### Phase 2 — Model registry (curated 3D product catalog)
- A bounded context: calibrated products (bottle, can, box, pouch, tube, jar),
  each with known **UV islands, dielines, material zones, physical dimensions,
  print bleed/safe zones**. User *selects the object* and *selects the surface*
  (front label / back / cap / shrink-sleeve) from the registry.
- Arbitrary GLB upload is a later lane (needs auto UV/topology analysis + safety
  scanning) — real, but sequenced after the registry proves the model.

### Phase 3 — The brief (3D-extended YAML, the enterprise contract)
- Adopt campaign-foundry's declarative-brief pattern, 3D-extended: model ref,
  per-surface UV targets, treatments, brand tokens, markets/locales, review
  angles, lighting environment, print/DPI specs, output targets.
- Reproducible, PR-reviewable, diffable, **headless/batch runnable**, auditable —
  the thing brand/legal sign off on before spend.

### Phase 4 — Generation + compositor (Track B, the headline)
- Real `FireflyTextureAdapter` / `GeminiImageTextureAdapter` behind the existing
  `TextureGenerationPort` (injectable SDK slice); prompt constrained to
  background art only.
- **Port campaign-foundry's canvas compositor** to overlay exact vector brand
  assets → the composite is the texture (see §1).
- Fallback chain + provenance + `Result` + bounded concurrency + `loadEnv`;
  **server-side in `apps/api`** (API keys must never reach the browser — this
  finally gives vellum's dormant Nitro app a job) → returns a texture URL the
  `asset-loader` applies to the mesh.
- **Reproducibility**: seed pinning + param capture; caching by content hash.

### Phase 5 — Mapping profiles (where the thesis lives)
- Surface/UV-island selection, fit modes (contain/cover/tile/stretch), anchor +
  safe-zone respect, per-surface art assignment, seam handling, UV-aware
  generation aspect ratio. Every mapping choice is invisible in 2D and revealed
  in 3D — *"flat looks good, spatial reveals the truth"* made literal.

### Phase 6 — Spatial review at scale + workflow
- Matrix grid of turntables; canonical review angles incl. the seam view; the
  existing distortion guardrail; lighting/environment presets.
- **Approval workflow with roles** (designer → brand manager → legal → market
  lead), a legal gate (campaign-foundry halts on prohibited terms), and the
  audit trail extended with model/prompt/seed/source. Structured rejections feed
  a correction loop (vellum's `correction-delta` is the seed).

### Phase 7 — Governance & provenance
- **C2PA / Content Credentials** on every generated asset — tamper-evident
  provenance manifests (model, prompt, human approver, timestamp) via Adobe's
  Content Authenticity Initiative. The responsible-AI governance story, and a
  strong Adobe-aligned signal.
- 3D brand compliance (logo safe-zone / clear-space / min-size on curved
  surfaces; brand-color density), color-management pass.

### Phase 8 — Multi-channel export (the enterprise value prop)
- One approval → many outputs: **glTF / USDZ** (web + mobile AR), pre-press
  dieline PDF, hero renders + turntable video, a spec sheet, downstream handoff.
- Framing: the approved 3D asset is the **master** feeding every channel —
  virtual product photography / digital twin replacing physical shoots.

### Later lanes (in scope, sequenced last)
- Generated PBR material maps; arbitrary GLB upload w/ auto-UV analysis;
  multi-market localization panels; generation→fine-tuning feedback loop;
  richer virtual-photography environments.

---

## 5. Constraints (vellum's gates)

- Manifest-driven packages + `sync:check` drift gate; arch-linter import/layer
  rules; JIT-source + `extensionAlias`; corepack-before-setup-node CI (fixed);
  no coverage threshold (low friction).
- **API keys server-side only** → `apps/api` composition root.
- **Offline floor stays first-class** — the static PNGs guarantee the demo never
  dark-screens when an API is absent/flaky; key-gated fallback preserves this.
- New runtime deps (`@google/genai`, `@napi-rs/canvas`, C2PA libs) are
  server-only (in `apps/api`) so they never hit the web bundle / `extensionAlias`
  path; add each to `.agents/tech-stack.md` in the same change.

## 6. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Live-API latency/cost/flakiness | Key-gated offline floor; cache by prompt+params hash; per-run budgets; pre-warm; the runbook's recording is still projector-insurance. |
| Text/logos unusable from pure generation | The compositor is backbone (§1) — generate background, composite exact vector assets. |
| API key can't live in browser | Server-side generation in `apps/api`; browser gets a URL. |
| Seams + curvature distortion | UV-aware generation + inpainted seams; the seam is a canonical review angle, not an afterthought. |
| Reproducibility for brand sign-off | Seed pinning + full param capture; approved assets are regenerable. |
| Matrix scale (hundreds of assets) | Bounded-concurrency pool + caching + selective regenerate (vellum already has attempt-scoped regenerate). |

## 7. Open decisions

- **D1 — Brand:** adopt campaign-foundry's Firefly `#1473e6` dark-first tokens
  (recommended, on-thesis) vs keep vellum's sky-blue/light.
- **D2 — Provider(s):** Firefly-first + Imagen fallback (on-brand; needs IMS
  token adapter) vs Imagen-only to start.
- **D3 — Registry vs upload:** curated registry first (recommended) vs arbitrary
  GLB upload early.
- **D4 — Compositor stack:** reuse `@napi-rs/canvas` server-side (matches
  campaign-foundry) vs a different rasterizer.
- **D5 — Re-generation on reject:** re-call the model vs reuse-image + re-apply
  UV transform (recommend: differ by feedback category, sharpening the
  UV_DISTORTION-vs-OTHER distinction).

---

### Appendix — key files

- **Vellum seam to extend:** `packages/texture-generation/src/application/ports/in/TextureGeneration.in-port.ts`, `.../infrastructure/adapters/{MockTexture,FireflyTexture}.adapter.ts`; pipeline `packages/pipeline-simulation/src/infrastructure/adapters/MockPipeline.adapter.ts`; composition root `apps/web/src/app/ReviewSession.tsx`; dormant `apps/api/server/routes/index.ts`.
- **Vellum design system / DESIGN.md:** `packages/ui/src/{styles/tokens.css,styles/theme.ts,lib/cn.ts,components/*}` (extracted into the shared `@vellum/ui` package), `apps/web/tailwind.config.ts`, `DESIGN.md`.
- **Campaign-foundry patterns to mirror** (frozen reference, sibling repo): `packages/CreativeGeneration/src/infrastructure/adapters/{GeminiImageGenerator,FireflyImageGenerator,ProceduralBackgroundGenerator,AssetReusingImageGenerator}.ts`, `packages/CampaignOrchestration/src/application/ports/out/ImageGeneratorPort.ts`, the 5-layer `NodeCanvasCompositor`, `apps/api/server/lib/{pipeline,env}.ts`, `packages/GovernanceAndCompliance` (provenance/compliance), `packages/Distribution` (pdf-lib proofs), design kit `apps/web/src/components/{ui,shell}/*`, and the YAML briefs in `briefs/`.
