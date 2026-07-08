# Design System

> **This file is the design contract.** It describes *intent*, not just values.
> Before changing any component or style, read this first; when you change a
> token, update the relevant row here in the same commit. AI agents treat this
> as an immutable anchor — deviations require an explicit, justified edit.

The CSS custom properties in `packages/ui/src/styles/tokens.css` implement this
contract and are the single source of truth (the design system lives in the
shared `@vellum/ui` package; the app imports the tokens via
`@import "@vellum/ui/styles/tokens.css"`). `packages/ui/src/styles/theme.ts`
mirrors them as `var(--token)` references for TypeScript. Tailwind
(`apps/web/tailwind.config.ts`) *extends* the default palette with these tokens
— it never replaces it.

---

## Colour Tokens

Values below are the **light** (`:root`) values; the dark (`.dark`) palette is
the near-black Adobe-Firefly set and is the **default** (see Dark Mode).

| Token            | CSS Variable                  | Value (light) | Usage                          |
| ---------------- | ----------------------------- | --------- | ------------------------------ |
| Brand Primary    | `--color-brand-primary`       | #1473e6   | CTAs, active states, links (Adobe/Firefly blue) |
| Brand Hover      | `--color-brand-primary-hover` | derived   | Hover/pressed on brand surfaces |
| Brand Secondary  | `--color-brand-secondary`     | #8b5cf6   | Accents, secondary emphasis    |
| Background       | `--color-background`          | #ffffff   | Page background                |
| Surface          | `--color-surface`             | #f8fafc   | Cards, raised panels           |
| Surface 2        | `--color-surface-2`           | #f1f5f9   | A more-raised surface (e.g. inputs on a panel) |
| Border           | `--color-border`              | #e2e8f0   | Dividers, input borders        |
| Border Hover     | `--color-border-hover`        | #cbd5e1   | Hovered dividers/inputs        |
| Text Primary     | `--color-text-primary`        | #0f172a   | Body copy, headings            |
| Text Secondary   | `--color-text-secondary`      | #64748b   | Supporting copy                |
| Success / Warning / Error / Info | `--color-success` … | semantic  | Status only — never decorative |

Extra elevation token: `--shadow-2xl` for large floating surfaces (modals,
drawers).

Brand Hover is derived from Brand Primary via `color-mix`, so it tracks the
primary automatically. Adjust Brand Secondary and the neutrals to taste.

## Typography

Base font family: **geist**. Load the actual font (e.g. `next/font`) and
keep the `--font-sans` stack in `tokens.css` as the fallback chain. Use Tailwind
`font-sans` / `font-mono`; do not hardcode `font-family` in components.

## Spacing & Radius

Spacing follows a 4px base unit — use Tailwind spacing classes (`p-4` = 16px).
Radius tokens: `--radius-sm` (4px), `--radius-md` (8px, the default for
buttons/inputs), `--radius-lg` (12px, cards), `--radius-full` (pills/avatars).

## Dark Mode

Strategy: **css-class**, and **dark is the default** — the root layout
(`apps/web/src/app/layout.tsx`) sets `class="dark"` on `<html>`, activating the
near-black Adobe-Firefly `.dark` palette in `tokens.css`; `tailwind.config.ts`
sets `darkMode: "class"`. Remove the class from `<html>` to ship light-first, or
change `darkMode` to `"media"` and move the `.dark` overrides under
`@media (prefers-color-scheme: dark)` for system-driven switching.

## Component Base

Components are built on: **shadcn-ui**. The generated stubs in
`packages/ui/src/components/` are framework-agnostic React (props + `cn()` + a11y) so they
work regardless; install the matching library if you chose one (e.g. shadcn-ui /
Radix primitives / Headless UI) and grow the stubs toward its patterns.

---

## Component Constraints

- **Buttons:** `border-radius = --radius-md`. Never square. Disabled and loading
  states reduce opacity and block pointer events; loading sets `aria-busy`.
- **Cards:** `shadow = --shadow-sm`. Elevation conveys hierarchy, not decoration.
- **Inputs:** `1px solid --color-border`; focus ring is `--color-brand-primary`.
  Error state sets `aria-invalid` *and* the red border together — never one alone.

## Prohibited Patterns

- Do not use arbitrary Tailwind values (e.g. `w-[237px]`) without a design reason.
- Do not hardcode hex values in components — reference tokens via Tailwind or
  `var(--token)`.
- Do not branch light/dark logic inside component files — rely on tokens that
  adapt.
