# Tech Stack Reference

The explicit, canonical list of tools. Read this before suggesting any library —
if it is not here (or is in "Never Suggest"), do not introduce it without asking.

## In Use

| Tool          | Purpose       | Notes                                              |
| ------------- | ------------- | -------------------------------------------------- |
| Next.js       | Web framework | App Router. Do not add Pages Router.               |
| React         | UI            | Function components + hooks; no class components.   |
| TypeScript    | Language      | `strict: true`. No `any` — narrow or use `unknown`. |
| Vitest        | Test runner   | `vitest run`; `import { describe, it } from "vitest"`. |
| node:assert / `expect()` | Assertions | `node:assert/strict` or Vitest's `expect()` — either is fine. |
| Zod           | Schema validation | Env validation today; `scene-types` contracts (schemas + inferred types) from phase 4. |
| clsx + tailwind-merge | Class composition | Only via the `cn()` helper in `apps/web/src/lib/cn.ts`. |
| Tailwind CSS  | Styling       | v3, `darkMode: "class"`. Tokens from `DESIGN.md`; no arbitrary values without a design reason. |
| three.js      | 3D            | The renderer. Confined to renderer/adapter packages — never imported by domain or orchestration. |
| @react-three/fiber + drei | React renderer for three | Canvas host and helpers (CameraControls, ContactShadows). |
| camera-controls | Camera        | drei's `CameraControls` wraps it — damped tween/orbit; chosen over OrbitControls for the re-generation reset. |
| @google/genai | Image generation | Google Imagen adapter. **Server-only** (`apps/api`) — never in the web bundle. Behind `ImageTextureGeneratorPort`; one tier of the Firefly→Imagen→OpenRouter→procedural chain. |

> Keep this table accurate. When you add a dependency (or a Hexagen template
> adds one), add its row here in the same change — a stale stack reference is
> how agents start hallucinating.

## Never Suggest

- **Jest / Mocha / Chai** — this project uses Vitest.
- **Pages Router** — App Router only.
- **`any`** — use a precise type, a generic, or `unknown` with narrowing.
- A new HTTP client, date library, or state manager **before checking** whether
  the standard platform API (`fetch`, `Intl`, React state) already covers it.

## Per-Template Additions

Hexagen templates extend this stack. After installing a template, add its
primary packages here — e.g. BullMQ + ioredis (background jobs), LangGraph
(agent graphs), Supabase (storage). Run `hexagen validate-templates` to see
what is installed.
